import { Controller, Get } from '@nestjs/common';

@Controller('app')
export class AppController {

    @Get()
    app(){
        return { message: 'App is running' };
    }
}
