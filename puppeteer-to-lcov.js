const PuppeteerToLcov = require('./lib/puppeteer-to-lcov');

module.exports = function (test, coverage) {
	return new PuppeteerToLcov(test, coverage);
}