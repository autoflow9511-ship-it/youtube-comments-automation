import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PublicFormsController } from './public-forms.controller';
import { PublicFormsService } from './public-forms.service';
import { PublicForm, PublicFormSchema } from '@database/mongodb/schemas/public-form.schema';
import { FormSubmission, FormSubmissionSchema } from '@database/mongodb/schemas/form-submission.schema';
import { EmailDeliveryStatus, EmailDeliveryStatusSchema } from '@database/mongodb/schemas/email-delivery-status.schema';
import { EmailProviderModule } from '@common/email/email-provider.module';
import { LandingPagesModule } from '@modules/landing-pages/landing-pages.module';
import { PrismaModule } from '@database/prisma.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PublicForm.name, schema: PublicFormSchema },
      { name: FormSubmission.name, schema: FormSubmissionSchema },
      { name: EmailDeliveryStatus.name, schema: EmailDeliveryStatusSchema },
    ]),
    EmailProviderModule,
    LandingPagesModule,
    PrismaModule,
  ],
  controllers: [PublicFormsController],
  providers: [PublicFormsService],
  exports: [PublicFormsService],
})
export class PublicFormsModule {}