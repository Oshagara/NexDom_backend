import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PropertyService } from './property.service';
import { PropertyController } from './property.controller';
import { Property, PropertySchema } from './property.schema';
import { UsersModule } from '../users/users.module';
import { User, UsersSchema } from '../users/users.schema'; // Import User and UsersSchema
import { AdminModule } from '../admin/admin.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Property.name, schema: PropertySchema },
    { name: User.name, schema: UsersSchema } // Register Property and Agent schemas
    ]),
    UsersModule,  // Import AgentModule to make AgentModel available
    AdminModule,
    NotificationsModule,
  ],
  providers: [PropertyService],
  controllers: [PropertyController],
  exports: [PropertyService] 
})
export class PropertyModule {}