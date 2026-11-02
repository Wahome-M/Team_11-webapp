# Monitoring Notes
PREDICTIONS:
1. Slowest endpoint: | GET | /users?role=worker&trade={trade}&location={location}&verified=true
   Reason: It returns verified workers filtered by trade and location. Much time will be taken in sorting out the data needed by a user who is looking for legitimate workers who do a specific job in a precise area. Sorting data based on these 2 data points causes delay, hence making the endpoint slow.

2. Error-prone endpoint: | POST | /jobs | Create a new job posting with category, location, and pay rate
   Reason: This endpoint is used by workers to create jobs in a specific category with location details and an exact pay rate. It is prone to error as one may accidentally create 2 or more jobs via double posting, or one may make the mistake of adding a job that has conditions that he or she did not want.