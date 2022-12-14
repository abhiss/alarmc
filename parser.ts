import { TokenType, TokenType as TT } from './token_type.ts';
import { Token } from './token.ts';
import { Assign, Binary, Expr, Grouping, Literal, Unary, Variable } from './expr.ts';
import { LoxError } from './main.ts';
import { Block, Expression, Goto, If, Label, Stmt, Var, While} from './Stmt.ts';
//a recursive descent parser
// Each method for parsing a grammar rule produces a syntax tree for that
// rule and returns it to the caller. When the body of rule contains nonterminal,
// we call that rule's method.
// Cannot handle left recursion.

export class Parser {
    private readonly tokens: Token[];
    private current = 0;

    constructor(tokens: Token[]) {
        this.tokens = tokens;
    }

    //program ->  declaration* EOF ;
    parse(): (Stmt | undefined)[] {
        const statements: (Stmt | undefined)[] = [];
        while (!this.isAtEnd()) {
            statements.push(this.declaration());
        }
        return statements;
    }
    //declaration -> varDecl | statement ;
    private declaration(): Stmt | undefined {
        //vars, functtions, classes
        try {
            if (this.match(TT.VAR)) return this.varDecl();
            if (this.match(TT.LABEL)) return this.label();
            return this.statement();
        } catch (error) {
            if (error instanceof ParseError) {
                this.synchronize();
            } else throw error;
        }
    }

    //varDecl -> "var " IDENTIFIER ("=" expression)? ";" ;
    private varDecl(): Stmt {
        const name = this.consume(TT.IDENTIFIER, 'Expect variable name.');
        let initializer: Expr;
        if (this.match(TT.EQUAL)) {
            initializer = this.expression();
        } else initializer = new Literal(null); // book doesn't wrap null in literal
        this.consume(TT.SEMICOLON, 'Expect \';\' after variable declaration');
        return new Var(name, initializer);
    }

    //label -> LABEL ':' IDENTIFIER
    private label(): Stmt {
        this.consume(TT.COLON, 'Expect : after label.');
        const name = this.consume(TT.IDENTIFIER, 'Expect variable name.');
        this.consume(TT.SEMICOLON, 'expect ; after label statement.');
        return new Label(name);
    }

    //statement -> ifStmt|printStmt|blockStmt|expressionStmt ;
    private statement(): Stmt {
        if (this.match(TT.IF)) return this.ifStatement();
        if(this.match(TT.WHILE)) return this.whileStatement();
        if (this.match(TT.GOTO)) return this.gotoStatement();
        if (this.match(TT.LEFT_BRACE)) return new Block(this.blockStatement());
        return this.expressionStatement();
    }

    // ifStmt -> 'if' '(' condition ')' then_stmt ('else' else_stmt)?
    private ifStatement(): Stmt {
        this.consume(TT.LEFT_PAREN, 'Expect \'(\' after \'if\'');
        const condition_expr = this.expression();
        this.consume(TT.RIGHT_PAREN, 'Expect ) after condition expression in \'if\' stmt');
        const then_branch = this.statement();
        let else_branch = null;
        if (this.match(TT.ELSE)) {
            else_branch = this.statement();
        }
        return new If(condition_expr, then_branch, else_branch);
    }

    //while statement -> 'while' '(' condition ')' then_stmt
    private whileStatement(): Stmt {
        this.consume(TT.LEFT_PAREN, 'expect \'(\' after "while"');
        const condition_expr = this.expression();
        this.consume(TT.RIGHT_PAREN, 'expect \')\' after conditional expression for while stmt.');
        const then_stmt = this.statement();
        return new While(condition_expr, then_stmt);
    }
    private blockStatement(): Stmt[] {
        const statements: Stmt[] = [];
        while (!this.check(TT.RIGHT_BRACE)) {
            statements.push(this.statement());
        }
        this.consume(TT.RIGHT_BRACE, 'expect \'}\' to close block statement.');
        return statements;
    }

    //printStmt -> "print" expression ;
    private gotoStatement(): Stmt {
        if (!this.match(TT.IDENTIFIER)) throw new Error('Label not found after "goto".');
        const value = new Goto(this.previous());
        this.consume(TT.SEMICOLON, 'Expect \';\' after label in goto statement.');
        return value;
    }
    private expressionStatement(): Stmt {
        const expr = this.expression();
        this.consume(TT.SEMICOLON, 'Expect \';\' after expression.');
        return new Expression(expr);
    }
    //expression     → assignment ;
    private expression(): Expr {
        return this.assignment();
    }
    //assignment -> IDENTIFIER "=" assignment | equality;
    private assignment(): Expr {
        const expr = this.andor();
        if (this.match(TT.EQUAL)) {
            const equals = this.previous();
            const value = this.assignment();
            if (expr instanceof Variable) {
                const name = expr.name;
                return new Assign(name, value);
            }
            LoxError(equals, 'Invalid assignment target.');
            //report error instead of throwing. throwing is to panic+sync
        }
        return expr;
    }

    //andor -> equality (( "and" | "or" ) eqality)*;
    private andor(): Expr{
        let expr = this.equality();
        while(this.match(TT.AND, TT.OR)){
            const operator = this.previous();
            const right = this.equality();
            expr = new Binary(expr,operator, right);
        }
        return expr;
    }

    //equality       → comparison ( ( "!=" | "==" ) comparison )* ;
    private equality(): Expr {
        let expr: Expr = this.comparison();
        while (this.match(TT.BANG_EQUAL, TT.EQUAL_EQUAL)) {
            const operator = this.previous();
            const right = this.comparison();
            expr = new Binary(expr, operator, right);
        }
        return expr;
    }

    //comparison     → term ( ( ">" | ">=" | "<" | "<=" ) term )* ;
    private comparison(): Expr {
        let expr: Expr = this.term();
        while (this.match(TT.GREATER, TT.GREATER_EQUAL, TT.LESS, TT.LESS_EQUAL)) {
            const operator = this.previous(); //previous is what just got matched.
            const right = this.term();
            expr = new Binary(expr, operator, right);
        }
        return expr;
    }

    //term -> factor (( "+" | "-" ) factor)*
    private term(): Expr {
        let expr: Expr = this.factor();
        while (this.match(TT.PLUS, TT.MINUS)) {
            const operator = this.previous(); //previous is what just got matched.
            const right = this.factor();
            expr = new Binary(expr, operator, right);
        }
        return expr;
    }

    private factor(): Expr {
        let expr: Expr = this.unary();
        while (this.match(TT.SLASH, TT.STAR)) {
            const operator = this.previous();
            const right = this.unary();
            expr = new Binary(expr, operator, right);
        }
        return expr;
    }

    //unary  → ( "!" | "-" ) unary | primary ;
    private unary(): Expr {
        if (this.match(TT.BANG, TT.MINUS)) {
            const operator = this.previous();
            const right = this.unary();
            return new Unary(operator, right);
        } else return this.primary();
    }

    //primary → NUMBER | STRING | "true" | "false" | "nil"| "(" expression ")" | IDENTIFIER;
    private primary(): Expr {
        if (this.match(TT.FALSE)) return new Literal(false);
        if (this.match(TT.TRUE)) return new Literal(true);
        if (this.match(TT.NIL)) return new Literal(null);
        if (this.match(TT.NUMBER, TT.STRING)) {
            return new Literal(this.previous().literal);
        }
        if (this.match(TT.LEFT_PAREN)) {
            const expr = this.expression();
            this.consume(TT.RIGHT_PAREN, 'Expect \')\' after expression.');
            return new Grouping(expr);
        }
        if (this.match(TT.IDENTIFIER)) return new Variable(this.previous());

        //if we end up here and don't actually have a literal, the input is not
        //valid.
        throw this.error(this.peek(), 'Expect expression.');
    }

    /**
     * Primatives
     */

    //checks if current token matches Type[], and consumes it!
    private match(...types: TokenType[]) {
        for (const type of types) {
            if (this.check(type)) {
                this.advance();
                return true;
            }
        }
        return false;
    }

    private consume(type: TokenType, message: string): Token {
        if (this.check(type)) return this.advance();
        else throw this.error(this.peek(), message);
    }

    // returns true if current token is of `type`
    private check(type: TokenType): boolean {
        if (this.isAtEnd()) return false;
        return this.peek().type == type;
    }

    //consumes current token and returns it
    private advance(): Token {
        if (!this.isAtEnd()) this.current++;
        return this.previous();
    }

    private isAtEnd(): boolean {
        return this.peek().type == TT.EOF;
    }

    //returns current token we haven't yet consumed
    private peek(): Token {
        return this.tokens[this.current];
    }

    //returns most recently consumed token
    private previous(): Token {
        return this.tokens[this.current - 1];
    }

    private error(token: Token, message: string): SyntaxError {
        LoxError(token, message);
        return new ParseError();
    }

    private synchronize(): void {
        this.advance();
        while (!this.isAtEnd()) {
            if (this.previous().type == TT.SEMICOLON) return;
            switch (this.peek().type) {
                case TT.CLASS:
                case TT.FUN:
                case TT.VAR:
                case TT.FOR:
                case TT.IF:
                case TT.WHILE:
                case TT.GOTO:
                case TT.RETURN:
                    return;
            }
            this.advance();
        }
    }
}

export class ParseError extends Error {
    /** */
    constructor() {
        super();
        this.message = 'ParseError';
        this.stack = new Error().stack;
        // this.name = this.constructor.name;
    }
}
