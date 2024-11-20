import {
  Contract,
  SubscriptionInstance,
  SubscriptionPlan,
  TenantCompany,
} from '@aimingle/entity';
import { SubscriptionProductCredits } from '@aimingle/entity/dist/entities/ContractModules/SubscriptionProductCredits';
import { TenantProductUsage } from '@aimingle/entity/dist/entities/TenantModules/TenantProductUsage';
import logger from '@utils/logger';
import { getRepository } from 'typeorm';

const FREE_PLAN_ID = '3';

export async function createDefaultContract(
  companyId: number,
): Promise<any> {
  logger.info(
    `createDefaultContract: Starting creation of default contract and subscription for company ID: ${companyId}`,
  );

  try {
    const company = await getRepository(TenantCompany).findOneOrFail(companyId);
    logger.debug('Checking for existing contract for the user');
    const hasSubscription = Boolean(
      await getRepository(Contract).count({ companyId: company.id }),
    );
    if (hasSubscription) {
      logger.warn(`Contract already exists for company ID ${companyId}`);
      return;
    }

    // const userRepository = getRepository(User);
    const planRepository = getRepository(SubscriptionPlan);
    const contractRepository = getRepository(Contract);
    const subscriptionInstanceRepository = getRepository(SubscriptionInstance);
    const productCreditsRepository = getRepository(SubscriptionProductCredits);
    const tenantUsageRepository = getRepository(TenantProductUsage);
    // const bundleRepository = getRepository(ProductBundle);

    // Fetch Free Plan
    // const freePlan = await planRepository.findOne({
    //   where: { subscriptionPlan: 'Free Plan' },
    //   relations: ['includedProducts', 'includedProducts.product'],
    // });
    // if (!freePlan) throw new Error('Free Plan not found');

    const freePlanWithBundle = await planRepository
      .createQueryBuilder('plan')
      .select([
        'plan.id', // SubscriptionPlan fields
        'plan.name',
        'plan.price',
        'bundle.id', // ProductBundle fields
        'bundle.name',
        'includedProduct.id', // IncludedProduct fields
        'product.id', // Product fields
        'product.name',
        'product.dailyCreditValue',
      ])
      .leftJoinAndSelect('plan.productBundles', 'bundle')
      .leftJoinAndSelect('bundle.includedProducts', 'includedProduct')
      .leftJoinAndSelect('includedProduct.product', 'product')
      .where('plan.id = :planId', { planId: FREE_PLAN_ID }) // Replace planId with the desired plan ID
      .getOne();
    if (!freePlanWithBundle) throw new Error('Free Plan not found');

    const {
      id: freePlanId,
      name: freePlanName,
      productBundles,
    } = freePlanWithBundle;

    // Ensure at least one product bundle exists
    if (!productBundles || productBundles.length === 0) {
      throw new Error('No product bundles found for the Free Plan');
    }

    const includedProducts = productBundles.flatMap((bundle) =>
      bundle.includedProducts.map((includedProduct) => includedProduct.product),
    );

    // Define Trial Period
    const trialStartDate = new Date();
    const trialEndDate = new Date(trialStartDate);
    trialEndDate.setDate(trialStartDate.getDate() + 14); // 14-day trial

    logger.debug(
      `createDefaultContract: Creating Contract for company ID: ${companyId} with ${freePlanName} (ID: ${freePlanId})`,
    );

    // Create Contract
    const contract = contractRepository.create({
      company,
      plan: freePlanWithBundle,
      contractTerms: 'Default Free Plan Terms',
      startDate: trialStartDate,
      trialStartDate,
      trialEndDate,
      freeCredits: freePlanWithBundle.price === 0 ? 100 : 0, // Example logic for free plan credits
      autoRenew: false,
    });
    await contractRepository.save(contract);

    logger.debug(`createDefaultContract: Contract Created for ${companyId}`);
    logger.debug(
      `createDefaultContract: Creating Subscription Instance for contract for ${companyId} with ${contract}`,
    );

    // Create Subscription Instance
    const subscriptionInstance = subscriptionInstanceRepository.create({
      company,
      plan: freePlanWithBundle,
      contract,
      startDate: trialStartDate,
      active: true,
    });
    await subscriptionInstanceRepository.save(subscriptionInstance);
    logger.debug(
      `createDefaultContract: Created Subscription Instance for contract for ${companyId}`,
    );

    logger.debug(
      `createDefaultContract: Creating Subscription Product Credits for ${companyId}`,
    );
    // Allocate Credits for Products
    const subscriptionProductCredits: SubscriptionProductCredits[] =
      includedProducts.map((product) =>
        productCreditsRepository.create({
          subscriptionInstance,
          product,
          creditsAllocated: product.dailyCreditValue * 14, // Allocate credits for the trial period
          creditsConsumed: 0,
        }),
      );
    await productCreditsRepository.save(subscriptionProductCredits);
    logger.debug(
      `createDefaultContract: Created Subscription Product Credits for ${companyId}`,
    );

    logger.debug(
      `createDefaultContract: Creating Tenant Product Usage records with allocated credits for ${companyId}`,
    );
    // Update Tenant Product Usage
    for (const product of includedProducts) {
      let tenantProductUsage = await tenantUsageRepository.findOne({
        where: { company, product },
      });

      if (!tenantProductUsage) {
        tenantProductUsage = tenantUsageRepository.create({
          company,
          product,
          creditsAllocated: product.dailyCreditValue * 14,
          creditsConsumed: 0,
        });
      } else {
        tenantProductUsage.creditsAllocated += product.dailyCreditValue * 14;
      }

      await tenantUsageRepository.save(tenantProductUsage);
    }
    logger.debug(
      `createDefaultContract: Created Tenant Product Usage records with allocated credits for ${companyId}`,
    );

    logger.debug(
      'createDefaultContract: Default contract and subscription created successfully',
    );
    return { contract, subscriptionInstance };
  } catch (error) {
    logger.error(
      `createDefaultContract: Error during contract and subscription creation: ${error}`,
    );
    throw error;
  }

  return;
}
