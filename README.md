- If getting a bunch of typescript errors when buuilding, add skipLibCheck: true to tsconfig. Also get significant perf increase by skipping checking .d.ts files, particularly those in node_modules. Recommended by TS.
