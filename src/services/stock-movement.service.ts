import { /* inject, */ BindingScope, injectable} from '@loopback/core';
import {DefaultTransactionalRepository, Transaction, repository} from '@loopback/repository';
import {HttpErrors} from '@loopback/rest';
import {StockCount, StockMovement, StockMovementType} from '../models';
import {StockCountRepository, StockMovementRepository} from '../repositories';

interface IStockMovement {
  profileId: number;
  organizationId: number;
  branchOfficeId: number;
  warehouseId: number;
  productId: number;
  type: number;
  qty: number;
  lot?: string;
}

@injectable({scope: BindingScope.TRANSIENT})
export class StockMovementService {
  constructor(
    @repository(StockMovementRepository) public stockMovementRepository: StockMovementRepository,
    @repository(StockCountRepository) public stockCountRepository: StockCountRepository
  ) { }

  public async create(data: IStockMovement, tx: Transaction | undefined = undefined): Promise<StockMovement> {
    let ltx: Transaction | undefined = tx;
    if (tx === undefined) {
      const repo = new DefaultTransactionalRepository(StockMovement, this.stockMovementRepository.dataSource);
      ltx = await repo.beginTransaction();
    }

    let stockCount = await this.stockCountRepository.findOne({
      where: {
        warehouseId: data.warehouseId,
        productId: data.productId,
      }
    });

    if (stockCount == null) {
      const cdata = new StockCount({
        organizationId: data.organizationId,
        branchOfficeId: data.branchOfficeId,
        warehouseId: data.warehouseId,
        productId: data.productId,
        stock: 0,
      });
      stockCount = await this.stockCountRepository.create(cdata);
    }

    const qty = data.qty || 0;
    if (qty < 0) {
      throw new HttpErrors[422]('La cantidad debe ser mayor o igual a cero.');
    }

    const s_before = stockCount != null ? stockCount.stock : 0;
    let s_after = s_before;

    switch (data.type) {
      case StockMovementType.SET:
        s_after = qty;
        break;
      case StockMovementType.IN:
        s_after += qty;
        if (qty < 0) {
          throw new HttpErrors[422]('La cantidad debe ser mayor a cero.');
        }
        break;
      case StockMovementType.OUT:
        s_after -= qty;
        if (s_after < 0) {
          throw new HttpErrors[422]('La cantidad debe ser menor o igual a las existencias.');
        }
        break;
    }

    const movement = await this.stockMovementRepository.create({
      profileId: data.profileId,
      organizationId: data.organizationId,
      branchOfficeId: data.branchOfficeId,
      warehouseId: data.warehouseId,
      productId: data.productId,
      type: data.type,
      qty: qty,
      stockBefore: s_before,
      stockAfter: s_after,
      lot: data.lot || '',
    }, {transaction: ltx});

    Object.assign(stockCount, {stock: s_after});
    await this.stockCountRepository.replaceById(stockCount.id, stockCount, {transaction: ltx});

    if (tx === undefined && ltx !== undefined) {
      await ltx.commit();
    }

    return movement;
  }
}
