import esbuild from 'esbuild';
import esbuildSvelte from 'esbuild-svelte';
import sveltePreprocess from 'svelte-preprocess';
import builtins from 'builtin-modules';

const prod = process.argv[2] === 'production';

const context = await esbuild.context({
    entryPoints: ['src/main.ts'],
    bundle: true,
    external: ['obsidian', 'electron', ...builtins],
    format: 'cjs',
    target: 'es2018',
    logLevel: 'info',
    sourcemap: prod ? false : 'inline',
    treeShaking: true,
    outfile: 'dist/main.js',
    plugins: [
        esbuildSvelte({
            compilerOptions: { css: true },
            preprocess: sveltePreprocess(),
        }),
    ],
});

if (prod) {
    await context.rebuild();
    await context.dispose();
} else {
    await context.watch();
}
