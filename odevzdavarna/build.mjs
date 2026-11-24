import {rm} from 'node:fs/promises';
import {build} from 'esbuild';
await rm('odevzdavarna/chunks',{recursive:true,force:true});
await build({entryPoints:['odevzdavarna/src/student.js','odevzdavarna/src/teacher.js'],bundle:true,minify:true,target:['es2020'],format:'esm',splitting:true,chunkNames:'chunks/[name]-[hash]',legalComments:'eof',outdir:'odevzdavarna',logLevel:'info'});
