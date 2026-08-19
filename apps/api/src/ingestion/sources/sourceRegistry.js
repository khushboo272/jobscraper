const remoteok = require('./remoteok.js');
const indeed = require('./indeed.js');
const linkedin = require('./linkedin.js');
const naukri = require('./naukri.js');
const wellfound = require('./wellfound.js');

const registry = {
  [remoteok.SOURCE_NAME]: remoteok,
  [indeed.SOURCE_NAME]: indeed,
  [linkedin.SOURCE_NAME]: linkedin,
  [naukri.SOURCE_NAME]: naukri,
  [wellfound.SOURCE_NAME]: wellfound,
};

function getAllSources() {
  return Object.values(registry);
}

function getSource(name) {
  return registry[name] || null;
}

module.exports = {
  getAllSources,
  getSource,
};
