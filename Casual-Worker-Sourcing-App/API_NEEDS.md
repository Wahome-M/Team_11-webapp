 **API Needs Statements**

1. Worker Search
 **Needs Statement:** Property Management App needs to read a list of verified workers filtered by trade skill and geographic location in order to display available local plumbers and electricians to tenants during home maintenance emergencies.
 **Freshness:** Real-time data is required so tenants only view workers who are currently active and available.
 **Volume:** Low-to-medium volume, called once per tenant search or page load.
 **Auth:** Publicly readable endpoint; no authentication required to view basic worker listings.

2. Job Booking Dispatch
 **Needs Statement:** Concierge Service App needs to create a new booking request with job description, client contact details, and location in order to automatically dispatch repair requests into FundiLink’s worker queue.
 **Freshness:** Near real-time execution so workers receive immediate job notifications.
 **Volume:** Low volume, called only when a client or partner service submits a new job.
 **Auth:** Authentication required via an API key or bearer token to identify and verify the third-party partner app.

3. Worker Verification
 **Needs Statement:** Trust & Identity App needs to read a worker’s completion history, verification badge status, and average customer star rating in order to validate worker eligibility before approving them for high-value contractor work.
 **Freshness:** Updated within the hour or on-demand cached data is sufficient.
 **Volume:** Low volume, triggered only during background checks or worker onboarding events.
 **Auth:** Highly sensitive endpoint requiring strict authentication and authorized partner permissions.

4. Job Status Tracking
 **Needs Statement:** External Notification Service needs to read active booking status updates in order to send real-time SMS alerts to clients when a fundi arrives or finishes a task.
 **Freshness:** Real-time data required to deliver immediate status updates.
 **Volume:** Medium volume, called periodically via polling or webhooks on state changes.
 **Auth:** Requires authenticated service-to-service credentials to protect private client-worker job updates.

**Reflection paragraph**
During our partner interviews, we were surprised by how strictly our downstream consumer team focused on read-only worker data rather than initiating full job lifecycles. We had initially assumed they would need full CRUD endpoints to edit job postings, delete reviews, and manage user accounts directly. However, learning that their application only required querying active, verified workers by location and reading booking status transitions saved us from designing unnecessary mutation endpoints. On the upstream side, we were surprised to discover that rating aggregation isn't calculated dynamically on each request; instead, worker averages are pre-calculated, which completely shifted our expectation from needing high-volume computation endpoints to simple, low-latency cached GET requests.