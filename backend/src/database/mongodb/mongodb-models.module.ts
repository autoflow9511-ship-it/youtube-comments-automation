import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PublicForm, PublicFormSchema } from './schemas/public-form.schema';
import { FormSubmission, FormSubmissionSchema } from './schemas/form-submission.schema';
import { EmailDeliveryStatus, EmailDeliveryStatusSchema } from './schemas/email-delivery-status.schema';
import { AutomationVideo, AutomationVideoSchema } from './schemas/automation-video.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PublicForm.name, schema: PublicFormSchema },
      { name: FormSubmission.name, schema: FormSubmissionSchema },
      { name: EmailDeliveryStatus.name, schema: EmailDeliveryStatusSchema },
      { name: AutomationVideo.name, schema: AutomationVideoSchema },
    ]),
  ],
  exports: [MongooseModule],
})
export class MongoDBModelsModule {}