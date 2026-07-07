package org.bigbluebutton.core.db
import slick.jdbc.PostgresProfile.api._

case class UserConnectionStatusDbModel(
    meetingId:                  String,
    userId:                     String,
    sessionToken:               String,
    clientSessionUUID:          String,
    connectionAliveAt:          Option[java.sql.Timestamp],
    serverRequestId:            Option[String],
    networkRttInMs:             Option[Double],
    applicationRttInMs:         Option[Double],
    traceLog:                   Option[String],
    status:                     String,
    clientIsHidden:             Option[Boolean],
    clientVisibilityUpdatedAt:    Option[java.sql.Timestamp],

)

class UserConnectionStatusDbTableDef(tag: Tag) extends Table[UserConnectionStatusDbModel](tag, None, "user_connectionStatus") {
  override def * = (
    meetingId, userId, sessionToken, clientSessionUUID, connectionAliveAt, serverRequestId, networkRttInMs, applicationRttInMs, traceLog, status, clientIsHidden, clientVisibilityUpdatedAt
  ) <> (UserConnectionStatusDbModel.tupled, UserConnectionStatusDbModel.unapply)
  val meetingId = column[String]("meetingId", O.PrimaryKey)
  val userId = column[String]("userId", O.PrimaryKey)
  val sessionToken = column[String]("sessionToken", O.PrimaryKey)
  val clientSessionUUID = column[String]("clientSessionUUID", O.PrimaryKey)
  val connectionAliveAt = column[Option[java.sql.Timestamp]]("connectionAliveAt")
  val serverRequestId = column[Option[String]]("serverRequestId")
  val networkRttInMs = column[Option[Double]]("networkRttInMs")
  val applicationRttInMs = column[Option[Double]]("applicationRttInMs")
  val traceLog = column[Option[String]]("traceLog")
  val status = column[String]("status")
  val clientIsHidden = column[Option[Boolean]]("clientIsHidden")
  val clientVisibilityUpdatedAt = column[Option[java.sql.Timestamp]]("clientVisibilityUpdatedAt")
}

object UserConnectionStatusDAO {

  def insert(meetingId: String, userId: String, sessionToken: String, clientSessionUUID: String) = {
    DatabaseConnection.enqueue(
      TableQuery[UserConnectionStatusDbTableDef].insertOrUpdate(
        UserConnectionStatusDbModel(
          meetingId = meetingId,
          userId = userId,
          sessionToken = sessionToken,
          clientSessionUUID = clientSessionUUID,
          connectionAliveAt = None,
          serverRequestId = None,
          networkRttInMs = None,
          applicationRttInMs = None,
          traceLog = None,
          status = "normal",
          clientIsHidden = Some(false),
          clientVisibilityUpdatedAt = None
        )
      )
    )
  }

  def updateUserAlive(
                       meetingId: String,
                       userId: String,
                       sessionToken: String,
                       clientSessionUUID: String,
                       serverRequestId: String,
                       rtt: Double,
                       appRtt: Double,
                       traceLog: String,
                       status: String,
                       clientIsHidden: Option[Boolean]) = {
    val baseFilter = TableQuery[UserConnectionStatusDbTableDef]
        .filter(_.meetingId === meetingId)
        .filter(_.userId === userId)
        .filter(_.sessionToken === sessionToken)
        .filter(_.clientSessionUUID === clientSessionUUID)

    val aliveAt = Some(new java.sql.Timestamp(System.currentTimeMillis()))
    val serverReqId = Some(serverRequestId)
    val networkRtt = rtt match {
      case 0               => None
      case someRtt: Double => Some(someRtt)
    }
    val appRttOpt = appRtt match {
      case 0               => None
      case someRtt: Double => Some(someRtt)
    }
    val traceLogOpt = traceLog match {
      case ""          => None
      case log: String => Some(log)
    }

    clientIsHidden match {
      case Some(hidden) =>
        DatabaseConnection.enqueue(
          baseFilter
            .map(t => (t.connectionAliveAt, t.serverRequestId, t.networkRttInMs, t.applicationRttInMs, t.traceLog, t.status, t.clientIsHidden))
            .update((aliveAt, serverReqId, networkRtt, appRttOpt, traceLogOpt, status, Some(hidden)))
        )
      case None =>
        DatabaseConnection.enqueue(
          baseFilter
            .map(t => (t.connectionAliveAt, t.serverRequestId, t.networkRttInMs, t.applicationRttInMs, t.traceLog, t.status))
            .update((aliveAt, serverReqId, networkRtt, appRttOpt, traceLogOpt, status))
        )
    }
  }

}
