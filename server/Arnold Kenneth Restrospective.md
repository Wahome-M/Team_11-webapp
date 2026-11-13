# Retrospective Report - Arnold Kenneth

Role rotation: QA and Integration Tester (Weeks 1-3), API Lead (Weeks 4-7), DevOps (Weeks 8-10), Backend Developer (Weeks 11-14). Our roles changed from the team charter as we rotated.

## 1. The hardest part of the lifecycle

The hardest part of the lifecycle for me was Document and Test, specifically keeping our documentation honest while the codebase was moving fast. Kwezikulu had prior software engineering experience, so most coding was done on his laptop. Sitting around one screen made collaboration fast, but it created a bottleneck for documentation and testing: we would solve a problem in the code on Kwezi's laptop, move on to the next feature, and forget to update ENDPOINT_LIST.md or README.md.

The gap showed when we compiled BLIND_TEST_REPORT.md. Watching someone try to set up and run our project from a fresh clone, using only our written instructions, showed how many small steps we had skipped because the environment was already configured on Kwezi's machine. Making sure run.sh and npx jest worked from scratch on a clean folder, rather than just on the laptop we always coded on, was much harder than we expected and forced us to rethink how we tested. It is also how we missed moving our database variables from XAMPP to our live server during integration.

## 2. One real cross-team issue

The one that stands out happened on 28 October, in Week 10, when I was on DevOps. It was our first real call to NyumbaHub, the team we consume from. At 08:52 we called their /listings endpoint with the key they had given us and got a 401, "Missing or invalid API key". We wanted to know if it was us, so by 08:58 we had sent the same key three ways: as X-API-Key, as Authorization: Bearer and as ?api_key=. All three gave 401, so our side was fine. 

We sent NyumbaHub a bug report with what we did, what we expected, what we got, the evidence and the time. They replied with a command using localhost:5000, which only works on their own laptop, and that told us their key was set locally but not on their Render deployment. While they fixed it we built against a stand-in server so we weren't stuck. At 09:27 we retried and got a 200 with the listings, like 35 minutes after the first call. It was their configuration, not our code.

That morning we also confused ourselves. A second npm start couldn't use port 5000 because the old server was still running, but our log printed "Server running" first, so we thought the new settings were live. We fixed server/index.js to print it only after a real start. Both are in INTEGRATION_LOG.md as bugs 7 and 8.

## 3. What I would design differently

If I could start the semester again, I would change two things from the beginning. First, I would standardize all of our database IDs as strings in Week 2 instead of mixing numbers and strings, because json-server compatibility issues cost us hours of debugging in Weeks 11 to 14. Second, I would enforce a rule that no endpoint is finished until its npx jest test is written and passing on a fresh clone, rather than letting implementation get ahead of testing during our group sessions on Kwezi's laptop. We saw the cost in Week 8, when a merge replaced our Week 6 validation with one check that accepted pay: 0, and we only noticed while preparing the docs.

What I would keep is the blind testing exercise and the role rotation. Rotating roles wasn't convenient, but it stopped us working in silos. By Week 14 everyone understood how .env variables, rate limiting and partner fallbacks connected, because each of us had owned a different piece.

## 4. My contribution

I rate my contribution a 7 out of 10. In Weeks 1 to 3 I set up our early QA checklist and helped draft CONTRACT_QUESTIONS.md so we knew what to ask our partner teams. In Weeks 4 to 7 as API Lead, I maintained ENDPOINT_LIST.md and compiled BLIND_TEST_REPORT.md to catch gaps in our setup docs. In Weeks 8 to 10 as DevOps, I worked on our run.sh startup flow and .env template. In Weeks 11 to 14 as Backend Developer, I worked with Kwezi to clean up dashboard bugs and make sure our database records used believable casual worker tasks instead of placeholder "test" or "123" strings, which was pointed out during our CAT2 when we failed to move real user details to the live server.

Where I was carried:
 I had less coding confidence than Kwezikulu, and most development happened on his laptop because of his prior experience, so he did most of the integrating and backend code. Because of that, a lot of what I worked on was committed under his name, and the git history shows only two commits under mine. I made sure I was contributing in those sessions by testing every route and endpoint he wrote, spotting cases that broke our contract, and keeping our documentation and test reports up to date so the team did not lose marks on deliverables.

 We truly appreciate you pointing out missing real users in our CAT2. We didn't realize that we failed to move the users in our XAMPP database, to the live server. Thank you for that insight and we hope that you will give us leniency on that.