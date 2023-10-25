import {inject} from '@loopback/core';
import {DefaultCrudRepository, DefaultTransactionalRepository, repository} from '@loopback/repository';
import {DbDataSource} from '../datasources';
import {Product, StockCount, StockMovement, StockMovementRelations, StockMovementType, Warehouse} from '../models';
import {StockCountRepository} from './stock-count.repository';

export class StockMovementRepository extends DefaultCrudRepository<
  StockMovement,
  typeof StockMovement.prototype.id,
  StockMovementRelations
> {
  constructor(
    @inject('datasources.db') dataSource: DbDataSource,
    @repository(StockCountRepository) public stockCountRepository: StockCountRepository,
  ) {
    super(StockMovement, dataSource);
  }

  public async register(
    profileId: number,
    // stockCount: StockCount,
    warehouse: Warehouse,
    product: Product,
    type: number,
    qty: number,
    // s_before: number,
    // s_after: number,
  ): Promise<boolean> {

    let count = await this.stockCountRepository.findOne({
      where: {
        warehouseId: warehouse.id,
        productId: product.id,
      }
    });

    if (count == null) {
      const cdata = new StockCount({
        organizationId: warehouse.organizationId,
        branchOfficeId: warehouse.branchOfficeId,
        warehouseId: warehouse.id,
        productId: product.id,
        stock: 0,
      });
      count = await this.stockCountRepository.create(cdata);
    }

    if (qty < 0) {
      return false;
    }

    const s_before = count != null ? count.stock : 0;
    let s_after = s_before;

    switch (type) {
      case StockMovementType.SET:
        s_after = qty;
        break;
      case StockMovementType.IN:
        s_after += qty;
        if (qty < 0) {
          return false;
        }
        break;
      case StockMovementType.OUT:
        s_after -= qty;
        if (s_after < 0) {
          return false;
        }
        break;
    }

    const repo = new DefaultTransactionalRepository(StockMovement, this.dataSource);
    const tx = await repo.beginTransaction();

    await this.create({
      profileId: profileId,
      organizationId: warehouse.organizationId,
      branchOfficeId: warehouse.branchOfficeId,
      warehouseId: warehouse.id,
      productId: product.id,
      type: type,
      qty: qty,
      stockBefore: s_before,
      stockAfter: s_after,
      lot: '',
    }, {transaction: tx});

    Object.assign(count, {stock: s_after});
    await this.stockCountRepository.replaceById(count.id, count, {transaction: tx});

    await tx.commit();

    return true;
  }

}
