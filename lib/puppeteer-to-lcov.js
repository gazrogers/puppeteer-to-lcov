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
		for(var index in this.coverage) {
			var include = this.config.exclude.reduce((result, fileExclusionPattern) => {
				return result && !minimatch(this.coverage[index].url, fileExclusionPattern);
			}, true);
			if(include) {
				var ranges = this.getRanges(this.coverage[index].ranges);
				lcovinfo.files[this.coverage[index].url] = this.getFileInformation(this.coverage[index], ranges);
			}
		}
		return this.lcovifyData(lcovinfo);
	}

	lcovifyData(data) {
		var output = [];
		output.push("TN:" + data.testname);
		for(var file in data.files) {
			output.push("SF:" + file);
			var funcCount = 0, funcHitCount = 0;
			for(var func in data.files[file].functions) {
				output.push("FN:" + data.files[file].functions[func].start + "," + func);
			}
			for(var func in data.files[file].functions) {
				output.push("FNDA:" + data.files[file].functions[func].hit + "," + func);
				funcCount += 1;
				funcHitCount += data.files[file].functions[func].hit;
			}
			output.push("FNF:" + funcCount);
			output.push("FNH:" + funcHitCount);
			var branchCount = 0, branchHitCount = 0;
			for(var branch in data.files[file].branches) {
				output.push("BRDA:" + data.files[file].branches[branch].line + "," + data.files[file].branches[branch].block + "," + data.files[file].branches[branch].branch + "," + data.files[file].branches[branch].hit);
				branchCount += 1;
				branchHitCount += data.files[file].branches[branch].hit;
			}
			output.push("BRF:" + branchCount);
			output.push("BRH:" + branchHitCount);
			var lineCount = 0, lineHitCount = 0;
			for(var line in data.files[file].lines) {
				output.push("DA:" + (parseInt(line) + 1) + "," + data.files[file].lines[line]);
				lineCount += 1;
				lineHitCount += data.files[file].lines[line];
			}
			output.push("LF:" + lineCount);
			output.push("LH:" + lineHitCount);
		}
		output.push("end_of_record");

		return output.join("\n");
	}

	getFileInformation(coverageEntry, ranges)
	{
		var parsedCode = parser.parse(coverageEntry.text, {sourceType: 'script'});
		var lcovinfo = {
			functions: this.getFunctionCoverage(parsedCode, ranges),
			lines: this.getLineCoverage(coverageEntry.text, ranges),
			branches: this.getBranchCoverage(parsedCode, ranges)
		};
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
		}, 0));

		return lines;
	}

	getFunctionCoverage(parsedCode, ranges) {
		var _this = this;
		var output = {};

		traverse.default(parsedCode, {
			FunctionDeclaration: function (path) {
				Object.assign(output, _this.processFunction(path, ranges));
			},
			FunctionExpression: function (path) {
				Object.assign(output, _this.processFunction(path, ranges));
			},
			ArrowFunctionExpression: function (path) {
				Object.assign(output, _this.processFunction(path, ranges));
			}
		});

		return output;
	}

	processFunction(path, ranges) {
		var name = (path.node.id ? path.node.id.name : 'anonymous') + "_" + path.node.start;
		var hitFlag = ranges.map(range => { return range.overlaps(path.node.body.start, path.node.body.end - 1); })
		.reduce((result, element) => { return result || element }, false);
		return { [name]: {start: path.node.loc.start.line, hit: (hitFlag ? 1 : 0)}};
	}

	getBranchCoverage(parsedCode, ranges) {
		var _this = this;
		var output = [];

		traverse.default(parsedCode, {
			IfStatement: function(path) {
				output.push(..._this.processChoice(path, ranges));
			},
			ConditionalExpression: function(path) {
				output.push(..._this.processChoice(path, ranges));
			},
			SwitchCase: function(path) {
				output.push(_this.processCase(path, ranges));
			}
		});

		return output;
	}

	processChoice(path, ranges) {
		var consequentHitFlag = ranges.map(range => { return range.overlaps(path.node.consequent.start, path.node.consequent.end - 1); })
		.reduce((result, element) => { return result || element }, false);
		// Unfortunately we don't have enough information for the following flag in the case that there is no else path.
		// If we had execution counts for each range, we could check if the consequent path was executed the same
		// number of times as it's containing block to check if it was ever skipped, but we don't. We'll have to return
		// true to avoid impossible to avoid uncovered branches.
		if(path.node.alternate) {
			var alternateHitFlag = ranges.map(range => { return range.overlaps(path.node.alternate.start, path.node.alternate.end - 1); })
			.reduce((result, element) => { return result || element }, false);
		} else {
			var alternateHitFlag = true;
		}

		return [{
			line: path.node.consequent.loc.start.line,
			block: path.node.consequent.start,
			branch: 0,
			hit: consequentHitFlag ? 1 : 0
		},
		{
			line: path.node.alternate ? path.node.alternate.loc.start.line : path.node.consequent.loc.end.line,
			block: path.node.alternate ? path.node.alternate.start : path.node.consequent.end,
			branch: 1,
			hit: alternateHitFlag ? 1 : 0
		}];
	}

	processCase(path, ranges) {
		var hitFlag = ranges.map(range => { return range.overlaps(path.node.start, path.node.end - 1); })
		.reduce((result, element) => { return result || element }, false);

		return {
			line: path.node.loc.start.line,
			block: path.node.start,
			branch: 0,
			hit: hitFlag ? 1 : 0
		};
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
			}
		});
	}
}