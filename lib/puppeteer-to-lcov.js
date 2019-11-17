const minimatch = require('/usr/local/lib/node_modules/minimatch');
const parser = require('/usr/local/lib/node_modules/@babel/parser');
const traverse = require('/usr/local/lib/node_modules/@babel/traverse');

module.exports = class PuppeteerToLcov {
	defaultConfig = {
		exclude: []
	}

	constructor (test, coverage, config) {
		this.test = test;
		this.coverage = coverage;
		this.config = Object.assign(this.defaultConfig, config);
	}

	output () {
		var output = "";
		var lcovinfo = {
			testname: this.test.fullTitle(),
			files: {}
		};
		// output += "TN:" + this.getTestName() + "\n";
		for(var index in this.coverage)
		{
			var include = this.config.exclude.reduce((result, fileExclusionPattern) => {
				return result && !minimatch(this.coverage[index].url, fileExclusionPattern);
			}, true);
			if(include) {
				var ranges = this.getRanges(this.coverage[index].ranges);
				lcovinfo.files[this.coverage[index].url] = this.getFileInformation(this.coverage[index], ranges);
			}
		}
		return JSON.stringify(lcovinfo);
	}

	getFileInformation(coverageEntry, ranges)
	{
		var parsedCode = parser.parse(coverageEntry.text, {sourceType: 'script'});
		// var output = "";
		var lcovinfo = {
			functions: this.getFunctionCoverage(parsedCode, ranges),
			lines: this.getLineCoverage(coverageEntry.text, ranges)
		};
		// output += "SF:" + coverageEntry.url + "\n";
		// output += this.getFunctionCoverage(parsedCode, ranges);
		// output += this.getLineCoverage(coverageEntry.text, ranges);
		// output += "end_of_record\n";
		// return output;
		return lcovinfo;
	}

	getLineCoverage(text, ranges) {
		var lines = {};
		Object.assign(lines, text.split('')
		// find the indeces of all the new lines
		.reduce((result, element, index) => {
			if(element == "\n")
				result.push(index);
			return result;
		}, [0])
		// Group them in overlapping pairs
		.reduce((result, element, index, array) => {
			if(index < array.length - 1)
				result.push(array.slice(index, index + 2));
			else
				result.push([element, text.length - 1]);
			return result;
		}, [])
		// Each pair represents the start and end character positions of a line
		// Check each pair to see if the line is completely covered by any range
		// Partial coverage does not count for line coverage
		.flatMap((element, index) => {
			var coveredFlag = ranges.map(range => { return range.containsRange(element[0], element[1]); })
			.reduce((result, element) => { return result || element }, false);
			return coveredFlag ? 1 : 0;
			// lines[index + 1] = (coveredFlag ? 1 : 0);
			// return hitCount + lines[index + 1];
			// lines += 1;
			// hits += (coveredFlag ? 1 : 0);
			// return result + "DA:" + (index + 1) + "," + (coveredFlag ? "1" : "0") + "\n";
		}, 0));
		// Output summary lines
		// output += "LH:" + hits + "\n";
		// output += "LF:" + lines + "\n";

		return lines;
	}

	getFunctionCoverage(parsedCode, ranges) {
		var _this = this;
		var output = {};

		traverse.default(parsedCode, {
			FunctionDeclaration: function (path) {
				Object.assign(output, _this.processFunction(path, ranges));
				// var name = (path.node.id ? path.node.id.name : 'anonymous') + "_" + path.node.start;
				// output += "FN:" + path.node.loc.start.line + "," + name + "\n";
				// functionsFound += 1;
				// console.log(path.node);
			},
			FunctionExpression: function (path) {
				Object.assign(output, _this.processFunction(path, ranges));
				// var name = (path.node.id ? path.node.id.name : 'anonymous') + "_" + path.node.start;
				// output += "FN:" + path.node.loc.start.line + "," + name + "\n";
				// functionsFound += 1;
				// console.log(path.node);
			},
			ArrowFunctionExpression: function (path) {
				Object.assign(output, _this.processFunction(path, ranges));
				// var name = (path.node.id ? path.node.id.name : 'anonymous') + "_" + path.node.start;
				// functionsFound += 1;
				// output += "FN:" + path.node.loc.start.line + "," + name + "\n";
				// console.log(path.node);
			}
		});
		// output += "FNF:" + functionsFound + "\n";
		// output += "FNH:" + functionsHit + "\n";

		return output;
	}

	processFunction(path, ranges) {
		var name = (path.node.id ? path.node.id.name : 'anonymous') + "_" + path.node.start;
		var hitFlag = ranges.map(range => { return range.overlaps(path.node.body.start, path.node.body.end - 1); })
		.reduce((result, element) => { return result || element }, false);
		return { [name]: {start: path.node.loc.start.line, hit: (hitFlag ? 1 : 0)}};
	}

	getAstCoverageInfo(text, ranges) {
		var branchesFound = 0;
		var branchesHit = 0;
		// console.log(parsedCode);


		// TODO: create an object to represent a range
		// Filter by:
		//  - start comes after end of range we're looking at
		//  - end comes before start of range we're looking at
		// Method to do the check to see if another range is completely contained
		// 
		// Should be able to refactor the line coverage code to use the range object
		// 

	}

	getRanges(ranges) {
		return ranges.map((range) => {
			return {
				start: range.start,
				end: range.end,
				isAfter(charPosition) { return start > charPosition; },
				isBefore(charPosition) { return end < charPosition; },
				containsRange(rangeStart, rangeEnd) {
					return Math.min(rangeStart, rangeEnd) >= this.start && Math.max(rangeStart, rangeEnd) < this.end;
				},
				overlaps(rangeStart, rangeEnd) {
					return Math.min(rangeStart, rangeEnd) < this.end && Math.max(rangeStart, rangeEnd) >= this.start;
				}
				// isContainedBy(rangeStart, rangeEnd) {

				// }
			}
		});
	}
}