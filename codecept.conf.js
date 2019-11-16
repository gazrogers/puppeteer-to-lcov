exports.config = {
  tests: './*_test.js',
  output: './output',
  helpers: {
    Puppeteer: {
      url: 'file:///Users/garethrogers/Documents/Programming/Javascript/codeceptjsplugin.html',
      show: false
    }
  },
  plugins: {
    puppeteerCoverage: {
      require: './customPuppeteerCoveragePlugin.js',
      enabled: true,
      output: [
        'puppeteer',
        // 'istanbul',
        'lcov'
      ]
    }
  },
  include: {
    I: './steps_file.js'
  },
  bootstrap: null,
  mocha: {},
  name: 'Javascript'
}