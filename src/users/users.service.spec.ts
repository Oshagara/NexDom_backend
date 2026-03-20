import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { UsersService } from './users.service';
import { AuthService } from '../auth/auth.service';

// Simple factory to create a mock for the Mongoose Model
const createUserModelMock = () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findByIdAndDelete: jest.fn(),
});

const createAuthServiceMock = () => ({
  register: jest.fn(),
});

describe('UsersService', () => {
  let service: UsersService;
  let userModel: ReturnType<typeof createUserModelMock>;
  let authService: ReturnType<typeof createAuthServiceMock>;

  beforeEach(async () => {
    userModel = createUserModelMock();
    authService = createAuthServiceMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getModelToken('User'), useValue: userModel },
        { provide: AuthService, useValue: authService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createUser', () => {
    it('should delegate to AuthService.register and return its result', async () => {
      const dto = { email: 'test@example.com', password: 'secret', name: 'Test' };
      const expected = { message: 'Registration successful. Please check your email for the verification code.' };
      (authService.register as jest.Mock).mockResolvedValue(expected);

      const result = await service.createUser(dto);

      expect(authService.register).toHaveBeenCalledTimes(1);
      expect(authService.register).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expected);
    });
  });

  describe('getUserById', () => {
    it('should call userModel.findOne with userId and return the user', async () => {
      const user = { userId: 'USR-1', email: 'user@example.com' };
      (userModel.findOne as jest.Mock).mockResolvedValue(user);

      const result = await service.getUserById('USR-1');

      expect(userModel.findOne).toHaveBeenCalledTimes(1);
      expect(userModel.findOne).toHaveBeenCalledWith({ userId: 'USR-1' });
      expect(result).toBe(user);
    });

    it('should return null when user is not found', async () => {
      (userModel.findOne as jest.Mock).mockResolvedValue(null);

      const result = await service.getUserById('UNKNOWN');

      expect(userModel.findOne).toHaveBeenCalledWith({ userId: 'UNKNOWN' });
      expect(result).toBeNull();
    });
  });

  describe('getUsersByRole', () => {
    it('should query with case-insensitive regex and return users', async () => {
      const users = [
        { userId: 'USR-1', role: 'Agent' },
        { userId: 'USR-2', role: 'agent' },
      ];

      const execMock = jest.fn().mockResolvedValue(users);
      (userModel.find as jest.Mock).mockReturnValue({ exec: execMock });

      const result = await service.getUsersByRole('Agent');

      // Ensure .find was called and the regex behaves as expected
      expect(userModel.find).toHaveBeenCalledTimes(1);
      const queryArg = (userModel.find as jest.Mock).mock.calls[0][0];
      expect(queryArg).toHaveProperty('role.$regex');
      expect(queryArg.role.$regex).toBeInstanceOf(RegExp);
      expect(queryArg.role.$regex.test('agent')).toBe(true);
      expect(queryArg.role.$regex.test('AGENT')).toBe(true);
      expect(queryArg.role.$regex.test('agentx')).toBe(false);

      expect(execMock).toHaveBeenCalledTimes(1);
      expect(result).toEqual(users);
    });
  });

  describe('getAllUsers', () => {
    it('should return all users by calling userModel.find', async () => {
      const users = [
        { userId: 'USR-1', email: 'a@example.com' },
        { userId: 'USR-2', email: 'b@example.com' },
      ];
      (userModel.find as jest.Mock).mockResolvedValue(users);

      const result = await service.getAllUsers();

      expect(userModel.find).toHaveBeenCalledTimes(1);
      expect(userModel.find).toHaveBeenCalledWith();
      expect(result).toBe(users);
    });
  });

  describe('updateUser', () => {
    it('should call findByIdAndUpdate with new: true and return updated user', async () => {
      const updated = { userId: 'USR-1', email: 'new@example.com' };
      (userModel.findByIdAndUpdate as jest.Mock).mockResolvedValue(updated);

      const result = await service.updateUser('id-1', { email: 'new@example.com' });

      expect(userModel.findByIdAndUpdate).toHaveBeenCalledTimes(1);
      expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith('id-1', { email: 'new@example.com' }, { new: true });
      expect(result).toBe(updated);
    });
  });

  describe('deleteUser', () => {
    it('should call findByIdAndDelete and return the deleted user', async () => {
      const deleted = { _id: 'id-1', userId: 'USR-1' };
      (userModel.findByIdAndDelete as jest.Mock).mockResolvedValue(deleted);

      const result = await service.deleteUser('id-1');

      expect(userModel.findByIdAndDelete).toHaveBeenCalledTimes(1);
      expect(userModel.findByIdAndDelete).toHaveBeenCalledWith('id-1');
      expect(result).toBe(deleted);
    });
  });
});
