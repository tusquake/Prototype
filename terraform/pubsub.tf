# GCP Pub/Sub Topic for Notification Events
resource "google_pubsub_topic" "notification_topic" {
  name    = var.pubsub_notification_topic_name
  project = var.project_id
}

# GCP Pub/Sub Subscription attached to the notification topic
resource "google_pubsub_subscription" "notification_sub" {
  name    = var.pubsub_notification_sub_name
  topic   = google_pubsub_topic.notification_topic.name
  project = var.project_id

  # 7 days message retention
  message_retention_duration = "604800s"
  retain_acked_messages      = false

  ack_deadline_seconds = 20

  expiration_policy {
    ttl = "" # Never expire subscription
  }

  retry_policy {
    minimum_backoff = "10s"
    maximum_backoff = "600s"
  }
}
