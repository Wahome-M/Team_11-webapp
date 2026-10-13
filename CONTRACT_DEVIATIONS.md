<<<<<<< HEAD
Week 6
**POST /jobs: added 400 Bad Request response.** Validation rejects missing required fields, wrong types, empty strings, non-positive pay, employerIds that don't match an existing employer, and malformed JSON, returning the contract's `Error` shape. The original contract only listed 201 and 500.
**POST /jobs: 201 response now returns the stored record.** It includes defaults (`payType`, `urgent`, `isActive`) instead of echoing the request body.
**GET /jobs is implemented but not in openapi.yaml** (carried over from Week 5). To be added to the contract or removed.
=======
No deviations
>>>>>>> c5c6c9622172a560697d4d45b4bec74adfb06c14
