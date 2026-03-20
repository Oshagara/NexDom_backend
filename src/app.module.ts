import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PropertyModule } from './property/property.module';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PaymentModule } from './payment/payment.module';
import { WalletModule } from './wallet/wallet.module';
import { TransactionsModule } from './transactions/transactions.module';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { MailerModule } from '@nestjs-modules/mailer';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import * as path from 'path';
import { JwtModule } from '@nestjs/jwt';
import { TenantsModule } from './tenants/tenants.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AdminModule } from './admin/admin.module';
import { EscrowModule } from './escrow/escrow.module';
import { EventsModule } from './events/events.module';
import { MaintenanceModule } from './maintenance/maintenance.module';
import { NotificationsModule } from './notifications/notifications.module';
import { DocumentsModule } from './documents/documents.module';
import { LoansModule } from './loans/loans.module';
import { InsuranceModule } from './insurance/insurance.module';
import { MortgageModule } from './mortgage/mortgage.module';


@Module({
  imports: [
    ConfigModule.forRoot(),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'), // <-- adjust if your uploads folder is elsewhere
      serveRoot: '/uploads', // URL prefix
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (config: ConfigService) => ({
        uri: `mongodb+srv://${config.get('MONGO_USERNAME')}:${config.get('MONGO_PASSWORD')}@${config.get('MONGO_HOST')}/${config.get('MONGO_DB_NAME', '')}?retryWrites=true&w=majority&appName=property`,
        // Mongoose 6+: no need for useNewUrlParser/useUnifiedTopology (driver handles defaults)
      }),
      inject: [ConfigService],
      connectionName: 'DatabaseConnection',
    }),

    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '7d' },
    }),
    // Configure MailerModule with Gmail SMTP settings from .env
    // MailerModule.forRoot({
    //   transport: {
    //     host: process.env.MAIL_HOST, // e.g., 'smtp.gmail.com'
    //     port: process.env.MAIL_PORT, // e.g., 587
    //     secure: false,
    //     auth: {
    //       user: process.env.MAIL_USER, // your email
    //       pass: process.env.MAIL_PASS, // your app-specific password
    //     },
    //   },
    //   defaults: {
    //     from: `"No Reply" <${process.env.MAIL_USER}>`, // Your email as the sender
    //   },
    //   template: {
    //     dir: path.join(__dirname, './templates'), // Path to your email templates
    //     adapter: new HandlebarsAdapter(), // For using handlebars templates
    //     options: {
    //       strict: true,
    //     },
    //   },
    // }),
    PropertyModule,
    PaymentModule,
    WalletModule,
    TransactionsModule,
    UsersModule,
    AuthModule,
    TenantsModule,
    AdminModule,
    EscrowModule,
    EventsModule,
    MaintenanceModule,
    NotificationsModule,
    DocumentsModule,
    LoansModule,
    InsuranceModule,
    MortgageModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
