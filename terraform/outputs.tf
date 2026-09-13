output "cloud_tasks_queue_id" {
  description = "Resource ID of the created Cloud Tasks Queue"
  value       = google_cloud_tasks_queue.task_queue.id
}

output "cloud_tasks_queue_name" {
  description = "Name of the created Cloud Tasks Queue"
  value       = google_cloud_tasks_queue.task_queue.name
}

output "worker_function_uri" {
  description = "HTTP Service URI of the Task Worker Cloud Function"
  value       = google_cloudfunctions2_function.sop_task_worker_fn.service_config[0].uri
}

output "reconciler_function_uri" {
  description = "HTTP Service URI of the Reconciler Audit Cloud Function"
  value       = google_cloudfunctions2_function.reconciler_fn.service_config[0].uri
}

output "reconciler_scheduler_job_name" {
  description = "Name of the Cloud Scheduler job triggering the 6-hour reconciler audit"
  value       = google_cloud_scheduler_job.reconciler_scheduler.name
}

output "cloud_tasks_service_account_email" {
  description = "Service Account email used for Cloud Tasks dispatching"
  value       = google_service_account.cloud_tasks_sa.email
}
