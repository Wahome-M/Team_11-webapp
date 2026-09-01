| Method | Path | Purpose | Maps to Need |
|--------|------|---------|---------------|
| GET | /users?role=worker&trade={trade}&location={location}&verified=true | Return verified workers filtered by trade and location | "Faraja needs to read a list of verified workers filtered by trade (e.g., cooking, security, driving) and location to display available local help to funeral committees planning an event." |
| POST | /jobs | Create a new job posting with category, location, and pay rate | "Faraja needs to create a new job posting (with category, location, and pay rate) to automatically request local casual workers on behalf of a family organizing a memorial." |
| GET | /jobs/{id}/bookings | List all applications submitted for a specific job posting, with each one's status | "Faraja needs to read the application status of a posted job to track and display on their dashboard whether a requested worker has been successfully secured for the funeral." |
| GET | /bookings/{id} | Read the current status of a single booking (e.g., confirm a specific requested worker has been secured) | "Faraja needs to read the application status of a posted job to track and display on their dashboard whether a requested worker has been successfully secured for the funeral." |
| GET | /users/{id} | Retrieve a worker's profile and verification details | "Faraja needs to read a worker's profile and verification details to ensure the casual staff being hired for sensitive memorial events are trustworthy and reliable." |

