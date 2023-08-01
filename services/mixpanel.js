const util = require("util");
const mixpanel = require("mixpanel").init(process.env.MIXPANNEL_TOKEN);
const trackAsync = util.promisify(mixpanel.track);

async function track(event, properties) {
  await trackAsync(event, properties);
}

async function people(distinctId, properties) {
  mixpanel.people.set(distinctId, properties);
}

module.exports = { track, people };
