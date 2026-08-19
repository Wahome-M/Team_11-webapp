TEAM 11


MEMBERS

WAHOME MWANGI- BACKEND DEV
KWEZIKULU BWOGA- DEV OPS
ARNOLD KENNETH- INTEGRATION/OA LEAD
LINCON MWAMBU- API LEAD


In FundiLink, our frontend files are set up to map directly to the resources stored in our db.json file. For instance, jobs.html and jobs.jsx handle the job board by firing off GET and POST requests to the /jobs endpoint whenever someone searches or posts a listing. For user authentication and profile views, login.html and login.js push and pull data from /users. We also have dashboard.html and dashboard.js managing applications and updating job statuses (like moving a job from Open to Completed) by sending PATCH requests to /bookings. Lastly, main.js handles worker reviews and star ratings by populating the /reviews array. Ultimately, all of our HTML forms and JavaScript fetch() calls are actively manipulating this JSON data, which essentially serves as the exact REST API our partner team is going to consume.


RING POSITION

CONSUME FROM- GROUP 10
CONSUMERS- GROUP 12