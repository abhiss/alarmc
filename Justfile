set shell := ["powershell.exe", "-c"]

default:
    just -l
all: gen asm

gen:
    # deno run --allow-write .\codegen.ts > .\test\test.s
    deno run --allow-write --allow-read  .\main.ts .\test\file.foo ./test/test.s 
asm: 
    .\alarmas.exe .\test\test.s ./test/test.o -l
