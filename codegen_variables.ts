//environment is what stores teh values of variable used in lox
import { LoxRuntimeError } from './main.ts';
import { RuntimeError } from './runtime_error.ts';
import { Token } from './token.ts';
const reset_r0 = 'mov r0 1\n'
export class CodegenEnvironment {
	readonly variable_to_addres = new Map<string, number>();
	readonly BASE_ADDR = 0x100;
	private current_addr = this.BASE_ADDR;

	//declare variable with register that contains initial value
	gen_define_variable(name: string, reg: string) {
		if (this.variable_to_addres.has(name)) {
			throw Error(`Trying to define variable: ${name} that is already defined.`);
		}

		const address = this.current_addr++;
		console.log(`assigning address: ${address} for variable: ${name}`);
		this.variable_to_addres.set(name, address);

		return `
 ; set variable ${name} to value in ${reg} at address ${address}
mov r1 ${address} ; address
str ${reg} [r1] 
`;
	}

	// //returns address of variable (in RAM)
	// get(name: Token): unknown {
	// 	if (this.variable_to_addres.has(name.lexeme)) {
	// 		return this.variable_to_addres.get(name.lexeme);
	// 	}
	// 	throw new RuntimeError(name, `Undefined variable: '${name.lexeme}'.`);
	// }
	gen_read_var_into_reg(name:string, reg: string): string {
		if(reg.toLowerCase() == 'r0') throw new Error('r0 not supported because it will be reset.')
        const address = this.variable_to_addres.get(name);
        if(!address) throw new Error(`Variable ${name} is not defined.`);
        return `; reading variable ${name} to register ${reg}
mov r0 ${address} ; address of variable
ldr ${reg} [r0]
${reset_r0}
`;
	}
}
