set shell := ["pwsh.exe", "-c"]

default:
    just -l
all: gen asm

gen:
    # deno run --allow-write .\codegen.ts > .\test\test.s
    deno run --allow-write --allow-read  .\main.ts .\examples\file.foo ./examples/test.s 
asm: 
    .\alarmas.exe .\examples\test.s C:\Users\asohal\Downloads\lab3\test.o -l

update_asm:
    cd ../alARM-assembler && git pull && g++ -O3 -o ..\alarmc\alarmas.exe .\alarmas.cpp

ast:
    deno run --allow-write  .\tools\generate_ast.ts .

test:
    deno test ./
