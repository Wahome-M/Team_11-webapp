// Week 13: the ONE place that knows the shape of NyumbaHub's API.
// Each version says where its listing list lives and turns the body into the same thing for the
// rest of our code: [{ id, status, reason, updatedAt }]. Switching version is one word in .env
// (PARTNER_VERSION=v1 or v2), and so is rolling back.
//
// v2: NyumbaHub had not sent a deprecation notice or a v2 shape when this was written. When it
// arrives, add its path and parser below (copy the example from their notice), add a test in
// partnerVersions.test.js, then set PARTNER_VERSION=v2.

function checkListings(list, version) {
  if (!Array.isArray(list)) throw new Error(`unexpected ${version} shape: no listings array`);
  return list.map((l) => ({ id: l.id, status: l.status, reason: l.reason, updatedAt: l.updatedAt }));
}

const versions = {
  v1: {
    listPath: '/listings',
    // v1 body: { listings: [ { id, status, reason, updatedAt } ] }
    parseList: (body) => checkListings(body && body.listings, 'v1'),
    detailPath: (id, what) => `/listings/${id}/${what}`, // what = location | size
  },
};

function partnerVersion() {
  const name = process.env.PARTNER_VERSION || 'v1';
  const v = versions[name];
  if (!v) throw new Error(`PARTNER_VERSION=${name} is not defined in server/server/partnerVersions.js`);
  return { name, ...v };
}

module.exports = { versions, partnerVersion };
