import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): object {
    return {
      success: true,
      message: 'Hello World',
    };
  }

  getSampleUser(): object {
    return {
      success: true,
      message: 'Sample user payload',
      data: {
        id: 'user_demo_001',
        email: 'demo.user@example.com',
        role: 'admin',
        createdAt: new Date('2023-01-01T00:00:00.000Z'),
        internalNotes: 'This field should not leak to API consumers',
      },
    };
    // throw new NotFoundException('User not found!');
  }
}
