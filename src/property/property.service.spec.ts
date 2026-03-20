import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { PropertyService } from './property.service';

const createModelMock = () => ({
  findById: jest.fn(),
  find: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findByIdAndDelete: jest.fn(),
});

describe('PropertyService', () => {
  let service: PropertyService;
  const propertyModel = createModelMock();
  const userModel = createModelMock();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PropertyService,
        { provide: getModelToken('Property'), useValue: propertyModel },
        { provide: getModelToken('User'), useValue: userModel },
      ],
    }).compile();

    service = module.get<PropertyService>(PropertyService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});