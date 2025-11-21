import scheduler from 'adonisjs-scheduler/services/main';

scheduler.command('inspire').everyFifteenMinutes();
