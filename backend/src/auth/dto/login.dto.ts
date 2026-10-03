    import { IsEmail, IsStrongPassword, MinLength } from 'class-validator';

    export class LoginDto { 

        @IsEmail()
        email: string;

        @IsStrongPassword(
            {
                minLength: 8,
                minLowercase: 1,
                minUppercase: 1,
                minNumbers: 1,
                minSymbols: 1
            },
            {
            message:'A senha deve ter mais de 8 caracteres, com pelo menos uma letra maiúscula, uma minúscula, um número e um caractere especial',
            }
        )
        password: string;
    }