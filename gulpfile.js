"use strict";

var gulp = require("gulp");
var babel = require('gulp-babel');

gulp.task("babel", function(){
  return gulp.src("src/*.jsx").
      pipe(babel({
          plugins: ['transform-react-jsx']
      })).
      pipe(gulp.dest("dist/"));
});

gulp.task("build", gulp.series("babel"));
