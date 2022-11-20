import { Assign, Binary, Expr, Grouping, Literal, Unary, Variable, Visitor as ExprVisitor } from "./expr.ts";
import { Token } from "./token.ts";
import { TokenType as TT } from "./token_type.ts";
import { RuntimeError } from "./runtime_error.ts";
import { LoxRuntimeError } from "./main.ts";
import { Expression, Print, Stmt, Var, Visitor as StmtVisitor } from "./Stmt.ts";
import { Environment } from "./environment.ts";

export class Interpreter implements ExprVisitor<unknown>, StmtVisitor<void>{
    private environment = new Environment();
    interpret(statements: Stmt[]){
        try{
            for (const statement of statements){
                this.execute(statement);
            }
        } catch (err) {
            if(err instanceof RuntimeError) { 
                LoxRuntimeError(err);
            }
            else throw err;
        }
    }
    
    visitGroupingExpr(expr: Grouping): unknown {
        return this.evaluate(expr.expression);
    }
    visitLiteralExpr(expr: Literal): unknown {
        return expr.value;
    }
    visitUnaryExpr(expr: Unary): unknown {
        const right = this.evaluate(expr.right);
        switch (expr.operator.type) {
            case TT.BANG: 
                return !this.isTruthy(right);
            case TT.MINUS: 
                this.checkNumberOperand(expr.operator, right);
                return -(right as number);
        }
    }
    private checkNumberOperand(operator: Token, operand:unknown){
        if(typeof operand == 'number') return;
        else throw new RuntimeError(operator, 'Operand must be a number.');
    }
    private checkNumberOperands(operator:Token, left:unknown, right:unknown){
        if(typeof left == 'number' && typeof right == 'number') return;
        else throw new RuntimeError(operator, "Operands must be numbers.");
    }

    visitBinaryExpr(expr: Binary): unknown {
        const left = this.evaluate(expr.left);
        const right = this.evaluate(expr.right);
        
        switch (expr.operator.type) {
            case TT.GREATER:
                this.checkNumberOperands(expr.operator,left,right);
                return <number>left > <number>right;
                case TT.GREATER_EQUAL:
                this.checkNumberOperands(expr.operator,left,right);
                return <number>left >= <number>right;
                case TT.LESS:
                this.checkNumberOperands(expr.operator,left,right);
                return <number>left < <number>right;
                case TT.LESS_EQUAL:
                this.checkNumberOperands(expr.operator,left,right);
                return <number>left <= <number>right;
            case TT.BANG_EQUAL:
                return !this.isEqual(left,right);
            case TT.EQUAL:
                return this.isEqual(left,right);
            case TT.MINUS:
                return left as number - (right as number);
            case TT.PLUS:
                if(typeof left == 'number' && typeof right == "number"){
                    return left as number + right as number;
                }
                if(['string','number'].includes(typeof left) && ['string','number'].includes(typeof right)){
                    return left as string + right as string;
                }
                throw new RuntimeError(expr.operator, 'Operands must 2 numbers or 2 strings.')
            case TT.SLASH:
                this.checkNumberOperands(expr.operator,left,right);
                return left as number / (right as number);
            case TT.STAR:
                this.checkNumberOperands(expr.operator,left,right);
                return left as number * (right as number);
            default:
                break;
        }
        console.trace('unreachable.')
        return null; //unreachable
    }


    private isTruthy(obj:unknown){
        if(obj == null) return false;
        if(typeof obj == 'boolean') return obj as boolean;
        return true;//everythning but false or nil;
    }
    private isEqual(a:unknown, b:unknown){
        if(a == null && b == null) return true;
        if(a==null) return false;
        return a === b;
    }
    private stringify(obj:unknown):string {
        if(obj == null) return 'nil';
        // if(typeof obj == 'number') return obj + '';
        return obj+'';
    }
    private evaluate(expr:Expr):unknown {
        return expr.accept(this);
    }

    visitExpressionStmt(stmt: Expression):void{
        this.evaluate(stmt.expression);
    }
    visitPrintStmt(stmt: Print): void {
        const value = this.evaluate(stmt.expression);
        console.log(value);
    }
    visitVarStmt(stmt: Var): void {
        let value = this.evaluate(stmt.initializer);
        this.environment.define(stmt.name.lexeme, value);
    }
    visitAssignExpr(expr: Assign): unknown {
        let value = this.evaluate(expr.value);
        this.environment.assign(expr.name, value);
        return value;
    }
    visitVariableExpr(expr: Variable): unknown {
        return this.environment.get(expr.name);
    }
    private execute(stmt:Stmt){
        stmt.accept(this);
    }    
}
