package org.bigbluebutton.core.db

import org.bigbluebutton.core.UnitSpec
import spray.json.{ JsNumber, JsObject }

class JsonUtilsSpec extends UnitSpec {

  it should "serialize millisecond timestamps represented as Long values" in {
    val timestamp = 1786778571638L
    val payload: Map[String, Any] = Map(
      "changedAt" -> timestamp,
      "revision" -> timestamp,
      "position" -> 0.0
    )

    val json = JsonUtils.mapToJson(payload).asInstanceOf[JsObject]

    json.fields("changedAt") shouldBe JsNumber(timestamp)
    json.fields("revision") shouldBe JsNumber(timestamp)
  }
}
