'use strict';

var gulp = require('gulp');
var babel = require('gulp-babel');
var preprocess = require('gulp-preprocess');
var fs = require('fs');


gulp.task('babel', function () {
	return gulp.src('src/*.jsx').
		pipe(preprocess({ context: Object.assign({},
			JSON.parse(fs.readFileSync('./package.json')),
			{ style: fs.readFileSync('./src/style.css') })
		})).
		pipe(babel({
			plugins: ['transform-react-jsx']
		})).
		pipe(gulp.dest('dist/'));
});

gulp.task('build', gulp.series('babel'));
