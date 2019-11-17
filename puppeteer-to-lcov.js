const PuppeteerToLcov = require('./lib/puppeteer-to-lcov');

module.exports = function (testName, coverage, config) {
	return new PuppeteerToLcov(testName, coverage, config);
}
