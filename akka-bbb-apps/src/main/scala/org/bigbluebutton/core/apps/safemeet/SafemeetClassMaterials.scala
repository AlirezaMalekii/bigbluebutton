package org.bigbluebutton.core.apps.safemeet

import org.bigbluebutton.SystemConfiguration
import org.bigbluebutton.common2.msgs.AnnotationVO
import org.bigbluebutton.core.domain.MeetingState2x
import org.bigbluebutton.core.models.PresentationInPod
import org.bigbluebutton.core.running.LiveMeeting
import org.slf4j.LoggerFactory
import spray.json._

import java.io.File
import java.nio.charset.StandardCharsets
import java.nio.file._
import java.nio.file.attribute.BasicFileAttributes
import scala.collection.mutable
import scala.util.Try

/**
 * SafeMeet: persist uploaded presentations + whiteboard annotations across BBB sessions
 * for the same external meetingID (class), with idle retention (default 14 days).
 */
object SafemeetClassMaterials extends SystemConfiguration {
  private val log = LoggerFactory.getLogger(getClass)

  private lazy val enabled: Boolean =
    Try(config.getBoolean("safemeet.classMaterials.enabled")).getOrElse(true)

  private lazy val materialsRoot: String =
    Try(config.getString("safemeet.classMaterials.dir"))
      .getOrElse("/var/bigbluebutton/safemeet-class-materials")

  private lazy val presentationRoot: String =
    Try(config.getString("safemeet.classMaterials.presentationDir"))
      .getOrElse("/var/bigbluebutton")

  private lazy val retentionDays: Int =
    Try(config.getInt("safemeet.classMaterials.retentionDays")).getOrElse(14)

  def snapshot(liveMeeting: LiveMeeting, state: MeetingState2x): Unit = {
    if (!enabled) return
    if (liveMeeting.props.meetingProp.isBreakout) return

    val extId = liveMeeting.props.meetingProp.extId
    val intId = liveMeeting.props.meetingProp.intId
    if (extId == null || extId.trim.isEmpty) return

    try {
      val safeExt = sanitizeExternalId(extId)
      val classDir = new File(materialsRoot, safeExt)
      val presentationsOut = new File(classDir, "presentations")
      if (classDir.exists()) {
        deleteRecursively(classDir.toPath)
      }
      presentationsOut.mkdirs()

      val pods = state.presentationPodManager.getAllPresentationPodsInMeeting()
      val presentationMetas = mutable.ArrayBuffer[JsObject]()
      val whiteboardPages = mutable.LinkedHashMap[String, JsArray]()

      pods.foreach { pod =>
        pod.presentations.values.foreach { pres =>
          copyPresentationTree(intId, pres.id, presentationsOut)
          presentationMetas += presentationMeta(pres)

          pres.pages.values.foreach { page =>
            val history = liveMeeting.wbModel.getHistory(page.id)
            if (history.nonEmpty) {
              whiteboardPages(page.id) = JsArray(history.map(annotationToJson).toVector)
            }
          }
        }
      }

      if (presentationMetas.isEmpty) {
        log.info("SafeMeet class materials: nothing to snapshot for extId={}", extId)
        deleteRecursively(classDir.toPath)
        return
      }

      val now = System.currentTimeMillis()
      val manifest = JsObject(
        "version" -> JsNumber(1),
        "externalMeetingId" -> JsString(extId),
        "internalMeetingId" -> JsString(intId),
        "savedAt" -> JsNumber(now),
        "lastAccessedAt" -> JsNumber(now),
        "retentionDays" -> JsNumber(retentionDays),
        "presentations" -> JsArray(presentationMetas.toVector)
      )
      val whiteboard = JsObject("pages" -> JsObject(whiteboardPages.toMap))

      writeJson(new File(classDir, "manifest.json"), manifest)
      writeJson(new File(classDir, "whiteboard.json"), whiteboard)

      log.info(
        "SafeMeet class materials snapshot saved extId={} presentations={} whiteboardPages={}",
        extId,
        presentationMetas.size,
        whiteboardPages.size
      )
    } catch {
      case e: Exception =>
        log.error("SafeMeet class materials snapshot failed for meeting {}", liveMeeting.props.meetingProp.intId, e)
    }
  }

  /**
   * After a restored presentation finishes conversion, reinject saved annotations.
   */
  def maybeRestoreAnnotations(liveMeeting: LiveMeeting, presentationId: String): Unit = {
    if (!enabled) return
    if (liveMeeting.props.meetingProp.isBreakout) return

    val extId = liveMeeting.props.meetingProp.extId
    val wbFile = new File(new File(materialsRoot, sanitizeExternalId(extId)), "whiteboard.json")
    if (!wbFile.isFile) return

    try {
      val root = new String(Files.readAllBytes(wbFile.toPath), StandardCharsets.UTF_8).parseJson.asJsObject
      val pages = root.fields.get("pages") match {
        case Some(JsObject(fields)) => fields
        case _                      => Map.empty[String, JsValue]
      }

      val prefix = presentationId + "/"
      var restored = 0
      pages.foreach {
        case (pageId, annotationsJson) if pageId.startsWith(prefix) =>
          val annotations = parseAnnotations(pageId, annotationsJson)
          if (annotations.nonEmpty) {
            liveMeeting.wbModel.addAnnotations(
              pageId,
              liveMeeting.props.meetingProp.intId,
              "system",
              annotations,
              isPresenter = true,
              isModerator = true
            )
            restored += annotations.length
          }
        case _ => // other presentations
      }

      if (restored > 0) {
        log.info(
          "SafeMeet restored {} whiteboard annotations for presentation {} meeting {}",
          restored,
          presentationId,
          liveMeeting.props.meetingProp.intId
        )
      }
    } catch {
      case e: Exception =>
        log.error(
          "SafeMeet whiteboard restore failed for presentation {} meeting {}",
          presentationId,
          liveMeeting.props.meetingProp.intId,
          e
        )
    }
  }

  private def copyPresentationTree(internalMeetingId: String, presentationId: String, presentationsOut: File): Unit = {
    val source = new File(
      presentationRoot + File.separator + internalMeetingId + File.separator +
        internalMeetingId + File.separator + presentationId
    )
    if (!source.isDirectory) {
      log.warn("SafeMeet class materials: missing presentation dir {}", source.getAbsolutePath)
      return
    }
    val dest = new File(presentationsOut, presentationId)
    copyRecursively(source.toPath, dest.toPath)
  }

  private def deleteRecursively(path: Path): Unit = {
    if (!Files.exists(path)) return
    Files.walkFileTree(path, new SimpleFileVisitor[Path] {
      override def visitFile(file: Path, attrs: BasicFileAttributes): FileVisitResult = {
        Files.deleteIfExists(file)
        FileVisitResult.CONTINUE
      }
      override def postVisitDirectory(dir: Path, exc: java.io.IOException): FileVisitResult = {
        Files.deleteIfExists(dir)
        FileVisitResult.CONTINUE
      }
    })
  }

  private def copyRecursively(source: Path, dest: Path): Unit = {
    Files.walkFileTree(source, new SimpleFileVisitor[Path] {
      override def preVisitDirectory(dir: Path, attrs: BasicFileAttributes): FileVisitResult = {
        val target = dest.resolve(source.relativize(dir).toString)
        if (!Files.exists(target)) {
          Files.createDirectories(target)
        }
        FileVisitResult.CONTINUE
      }
      override def visitFile(file: Path, attrs: BasicFileAttributes): FileVisitResult = {
        val target = dest.resolve(source.relativize(file).toString)
        Files.copy(file, target, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.COPY_ATTRIBUTES)
        FileVisitResult.CONTINUE
      }
    })
  }

  private def presentationMeta(pres: PresentationInPod): JsObject = {
    JsObject(
      "id" -> JsString(pres.id),
      "name" -> JsString(pres.name),
      "current" -> JsBoolean(pres.current),
      "downloadable" -> JsBoolean(pres.downloadable),
      "removable" -> JsBoolean(pres.removable),
      "default" -> JsBoolean(pres.default),
      "filenameConverted" -> JsString(pres.filenameConverted),
      "numPages" -> JsNumber(pres.numPages)
    )
  }

  private def annotationToJson(a: AnnotationVO): JsValue = {
    JsObject(
      "id" -> JsString(a.id),
      "userId" -> JsString(a.userId),
      "wbId" -> JsString(a.wbId),
      "annotationInfo" -> anyToJs(a.annotationInfo)
    )
  }

  private def anyToJs(value: Any): JsValue = value match {
    case null              => JsNull
    case n: Int            => JsNumber(n)
    case n: Long           => JsNumber(n)
    case n: Float          => JsNumber(n.toDouble)
    case n: Double         => JsNumber(n)
    case n: BigDecimal     => JsNumber(n)
    case s: String         => JsString(s)
    case b: Boolean        => JsBoolean(b)
    case m: Map[_, _] =>
      JsObject(m.asInstanceOf[Map[String, Any]].map { case (k, v) => k -> anyToJs(v) })
    case l: List[_]        => JsArray(l.map(anyToJs).toVector)
    case a: Array[_]       => JsArray(a.map(anyToJs).toVector)
    case v: Vector[_]      => JsArray(v.map(anyToJs))
    case other             => JsString(String.valueOf(other))
  }

  private def parseAnnotations(pageId: String, json: JsValue): Array[AnnotationVO] = {
    json match {
      case JsArray(elements) =>
        elements.flatMap {
          case JsObject(fields) =>
            val id = fields.get("id").collect { case JsString(s) => s }.getOrElse("")
            val userId = fields.get("userId").collect { case JsString(s) => s }.getOrElse("system")
            val wbId = fields.get("wbId").collect { case JsString(s) => s }.getOrElse(pageId)
            val info = fields.get("annotationInfo").map(jsValueToMap).getOrElse(Map.empty[String, Any])
            if (id.nonEmpty && info.nonEmpty) Some(AnnotationVO(id, info, wbId, userId)) else None
          case _ => None
        }.toArray
      case _ => Array.empty
    }
  }

  private def jsValueToMap(value: JsValue): Map[String, Any] = {
    value match {
      case JsObject(fields) =>
        fields.map {
          case (k, v) => k -> jsValueToAny(v)
        }
      case _ => Map.empty
    }
  }

  private def jsValueToAny(value: JsValue): Any = value match {
    case JsString(s)       => s
    case JsNumber(n)       => if (n.isValidInt) n.intValue else n.doubleValue
    case JsBoolean(b)      => b
    case JsNull            => null
    case JsArray(elements) => elements.map(jsValueToAny).toList
    case JsObject(fields)  => fields.map { case (k, v) => k -> jsValueToAny(v) }
  }

  private def writeJson(file: File, json: JsValue): Unit = {
    Files.write(file.toPath, json.prettyPrint.getBytes(StandardCharsets.UTF_8))
  }

  private def sanitizeExternalId(externalMeetingId: String): String =
    externalMeetingId.replaceAll("[^a-zA-Z0-9._-]", "_")
}
