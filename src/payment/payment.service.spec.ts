import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import axios from 'axios';
import { PaymentService } from './payment.service';
import { Payment } from './schema/payment.schema';

describe('PaymentService', () => {
  let service: PaymentService;
  let mockPaymentModel: jest.Mock;

  beforeEach(async () => {
    // Ensure environment variables are set BEFORE service instantiation
    process.env.FLW_SECRET_KEY = 'test_secret_key';
    process.env.FLW_BASE_URL = 'https://api.flutterwave.test';

    // Fresh constructor mock for each test
    mockPaymentModel = jest.fn().mockImplementation((data: any) => ({
      ...data,
      save: jest.fn().mockResolvedValue({ _id: 'saved_id_123', ...data }),
    }));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        {
          provide: getModelToken(Payment.name),
          useValue: mockPaymentModel,
        },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should initiate payment with correct payload and headers', async () => {
    const postSpy = jest
      .spyOn(axios, 'post')
      .mockResolvedValue({ data: { status: 'success', data: { link: 'https://pay.link' } } } as any);

    const input = { amount: 1500, email: 'user@example.com', name: 'Test User' };
    const result = await service.initiatePayment(input);

    expect(result).toEqual({ status: 'success', data: { link: 'https://pay.link' } });

    expect(postSpy).toHaveBeenCalledTimes(1);
    const expectedUrl = `${process.env.FLW_BASE_URL}/payments`;
    expect(postSpy).toHaveBeenCalledWith(
      expectedUrl,
      expect.objectContaining({
        amount: 1500,
        currency: 'NGN',
        customer: expect.objectContaining({ email: 'user@example.com', name: 'Test User' }),
        tx_ref: expect.stringMatching(/^tx-/),
      }),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: `Bearer ${process.env.FLW_SECRET_KEY}`,
          'Content-Type': 'application/json',
        }),
      })
    );
  });

  it("should throw 'Failed to initiate payment' and log error when API call fails", async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const postSpy = jest
      .spyOn(axios, 'post')
      .mockRejectedValue({ response: { data: { message: 'bad request' } } });

    await expect(
      service.initiatePayment({ amount: 100, email: 'x@y.com', name: 'X' })
    ).rejects.toThrow('Failed to initiate payment');

    expect(postSpy).toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith(
      'Payment error:',
      expect.anything()
    );
  });

  it('should verify payment by tx_ref with correct headers', async () => {
    const getSpy = jest
      .spyOn(axios, 'get')
      .mockResolvedValue({ data: { status: 'success', data: { id: 1, tx_ref: 'tx-123' } } } as any);

    const res = await service.verifyPayment('tx-123');

    expect(res).toEqual({ status: 'success', data: { id: 1, tx_ref: 'tx-123' } });

    const expectedUrl = `${process.env.FLW_BASE_URL}/transactions/verify_by_reference?tx_ref=tx-123`;
    expect(getSpy).toHaveBeenCalledWith(
      expectedUrl,
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: `Bearer ${process.env.FLW_SECRET_KEY}` }),
      })
    );
  });

  it("should throw 'Failed to verify payment' and log error when verification fails", async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const getSpy = jest
      .spyOn(axios, 'get')
      .mockRejectedValue({ response: { data: { message: 'not found' } } });

    await expect(service.verifyPayment('tx-missing')).rejects.toThrow('Failed to verify payment');

    expect(getSpy).toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith(
      'Verification error:',
      expect.anything()
    );
  });

  it('should save payment by instantiating the model and calling save', async () => {
    const paymentData = {
      tx_ref: 'tx-abc',
      amount: 2500,
      currency: 'NGN',
      email: 'payer@example.com',
      name: 'Payer',
      status: 'successful',
      flw_ref: 'FLW-REF',
    };

    const saved = await service.savePayment(paymentData);

    // Constructor called with data
    expect(mockPaymentModel).toHaveBeenCalledWith(paymentData);

    // The returned value should be the mocked saved document
    expect(saved).toEqual(expect.objectContaining({ _id: 'saved_id_123', ...paymentData }));
  });
});
