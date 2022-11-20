/*
Register usage:
r7 is PC+1 (next instruction). cannot be changed.
r6 is stack pointer. Only changed for push/pop stack operations.
r5-r3 are free so far.
r2-r1 are used to move data from stack/RAM into register to operate on them.
r0 should always = 1. A generator can use it temporarily but must restore it to 1. Used to inc/decrement r6 (stack pointer)
*/

import {
    Assign,
    Binary,
    Expr,
    Grouping,
    Literal,
    Unary,
    Variable,
    Visitor as ExprVisitor,
} from './expr.ts';
import { Expression, Var, Visitor as StmtVisitor } from './Stmt.ts';
import { Token } from './token.ts';
import { TokenType as TT } from './token_type.ts';
import { CodegenEnvironment } from './codegen_variables.ts';

const reset_r0 = 'mov r0 1\n';
const R = {
    0: 'r0',
    1: 'r1',
    2: 'r2',
    3: 'r3',
    4: 'r4',
    5: 'r5',
    6: 'r6',
    7: 'r7',
};

export class CodeGen implements ExprVisitor<unknown>, StmtVisitor<void> {
    variables = new CodegenEnvironment();
    private evaluate(expr: Expr): string {
        return expr.accept(this);
    }

    visitExpressionStmt(stmt: Expression): string {
        return this.evaluate(stmt.expression);
    }

    //variable definition
    visitVarStmt(stmt: Var): string {
        //assume evaluate generates code that puts data "value" on stack.
        let asm = '';
        asm += this.evaluate(stmt.initializer);
        asm += this.pop(R[0]);
        asm += this.variables.gen_define_variable(stmt.name.lexeme, R[0]);
        asm += reset_r0;
        return asm;
    }
    visitVariableExpr(expr: Variable): string {
        //push data from value onto stack
        let asm = `;pushing variable ${expr.name.lexeme} to stack`;
        asm += this.variables.gen_read_var_into_reg(expr.name.lexeme, R[1]);
        asm += this.push_reg(R[1]);
        asm += reset_r0;
        return asm;
    }
    visitBinaryExpr(expr: Binary) {
        return this.parenthesize(expr.operator, expr.left, expr.right);
    }
    visitGroupingExpr(expr: Grouping) {
        return this.parenthesize(undefined, expr.expression);
    }
    visitLiteralExpr(expr: Literal) {
        if (expr.value == null) return 'nil';
        // console.error('found literal: ' + expr.value);
        if (isNaN(parseInt(expr.value as string))) throw Error('value not a number');
        return this.push_value(parseInt(expr.value as string));
    }
    visitUnaryExpr(expr: Unary) {
        return this.parenthesize(expr.operator, expr.right);
    }
    private get_instr(operator: TT) {
        switch (operator) {
            case TT.PLUS:
                return 'add';
            case TT.STAR:
                return 'mul';
            case TT.MINUS:
                return 'sub';
            case TT.SLASH:
                return 'div';
            default:
                throw Error('Invalid operator. Only + * - / are supported.');
        }
    }
    private parenthesize(operator: Token | undefined, ...exprs: Expr[]): string {
        let builder = '';
        for (const expr of exprs) {
            builder += expr.accept(this);
            builder += '\n';
        }
        if (operator == undefined) {
            return builder;
        }
        const instr = this.get_instr(operator.type);
        const asm = [];
        asm.push(this.pop(R[2]));
        asm.push(this.pop(R[1]));
        asm.push('; operation add on r1 and r2');
        asm.push(`${instr} r1 r1 r2`);
        asm.push('str r1 [r6]');
        asm.push('add r6 r6 r0');
        builder += asm.join('\n');
        // builder += operator.lexeme;
        return builder;
    }

    private push_reg(reg: string): string {
        let asm =`
; pushing value of reg ${reg} to stack
str ${reg} [r6]
add r6 r6 r0 ; increment stack pointer
`
        return asm;
    }
    private push_value(num: number): string {
        let asm =`
; pushing ${num} to stack
mov r3 ${num}
str r3 [r6]
add r6 r6 r0 ; increment stack pointer
`
        return asm;
    }
    private pop(reg: string): string {
        let asm = [];
        asm.push(`; popping value off stack into ${reg}`);
        asm.push('sub r6 r6 r0'); //decrement stack pointer
        asm.push(`ldr ${reg} [r6]`);
        asm.push(`mov r3 0`);
        asm.push(`str r3 [r6]`);
        return asm.join('\n') + '\n';
    }
}
function example() {
    //main:
    const expression: Expr = new Binary(
        new Binary(
            new Literal(2),
            new Token(TT.PLUS, '+', null, 1),
            new Literal(2),
        ),
        new Token(TT.STAR, '*', null, 1),
        new Binary(
            new Literal(4),
            new Token(TT.PLUS, '+', null, 1),
            new Literal(4),
        ),
    );
    // console.log(JSON.stringify(expression));
    const gen = new CodeGen();
    console.log(gen.print(expression));
}

// example();
