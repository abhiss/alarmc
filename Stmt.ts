// deno-lint-ignore-file no-explicit-any
//this file is generated by generate_ast.ts
import { Token } from "./token.ts";
import { Expr } from "./expr.ts"

export abstract class Stmt {
    abstract accept(visitor: Visitor<any>):any;
}

export interface Visitor<R> {
    visitBlockStmt(stmt:Block): R;
    visitExpressionStmt(stmt:Expression): R;
    visitGotoStmt(stmt:Goto): R;
    visitLabelStmt(stmt:Label): R;
    visitIfStmt(stmt:If): R;
    visitVarStmt(stmt:Var): R;
    visitWhileStmt(stmt:While): R;
}

export class Block extends Stmt {
    readonly statements:Array<Stmt>;
    constructor(statements:Array<Stmt>) {
        super();
        this.statements = statements;
    }

    accept(visitor:Visitor<any>): any {
        return visitor.visitBlockStmt(this);
    }

}
export class Expression extends Stmt {
    readonly expression:Expr;
    constructor(expression:Expr) {
        super();
        this.expression = expression;
    }

    accept(visitor:Visitor<any>): any {
        return visitor.visitExpressionStmt(this);
    }

}
export class Goto extends Stmt {
    readonly label:Token;
    constructor(label:Token) {
        super();
        this.label = label;
    }

    accept(visitor:Visitor<any>): any {
        return visitor.visitGotoStmt(this);
    }

}
export class Label extends Stmt {
    readonly label:Token;
    constructor(label:Token) {
        super();
        this.label = label;
    }

    accept(visitor:Visitor<any>): any {
        return visitor.visitLabelStmt(this);
    }

}
export class If extends Stmt {
    readonly condition:Expr;
    readonly thenBranch:Stmt;
    readonly elseBranch:Stmt|null;
    constructor(condition:Expr, thenBranch:Stmt, elseBranch:Stmt|null) {
        super();
        this.condition = condition;
        this.thenBranch = thenBranch;
        this.elseBranch = elseBranch;
    }

    accept(visitor:Visitor<any>): any {
        return visitor.visitIfStmt(this);
    }

}
export class Var extends Stmt {
    readonly name:Token;
    readonly initializer:Expr;
    constructor(name:Token, initializer:Expr) {
        super();
        this.name = name;
        this.initializer = initializer;
    }

    accept(visitor:Visitor<any>): any {
        return visitor.visitVarStmt(this);
    }

}
export class While extends Stmt {
    readonly condition:Expr;
    readonly block:Stmt;
    constructor(condition:Expr, block:Stmt) {
        super();
        this.condition = condition;
        this.block = block;
    }

    accept(visitor:Visitor<any>): any {
        return visitor.visitWhileStmt(this);
    }

}

