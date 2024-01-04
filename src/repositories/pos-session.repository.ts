import {inject} from '@loopback/core';
import {DefaultCrudRepository, RepositoryBindings, repository} from '@loopback/repository';
import {DbDataSource} from '../datasources';
import {PosSession, PosSessionRelations} from '../models';
import {SaleRepository} from './sale.repository';

export class PosSessionRepository extends DefaultCrudRepository<
  PosSession,
  typeof PosSession.prototype.id,
  PosSessionRelations
> {
  public static BindingKey = `${RepositoryBindings.REPOSITORIES}.PosSessionRepository`;
  constructor(
    @inject('datasources.db') dataSource: DbDataSource,
    @repository(SaleRepository) public saleRepository: SaleRepository,
  ) {
    super(PosSession, dataSource);
  }

  public async getStarted(organizationId: number, branchOfficeId: number): Promise<PosSession | null> {
    let session = await this.findOne({
      where: {
        organizationId: organizationId,
        branchOfficeId: branchOfficeId,
        status: 'started'
      }
    });

    if (session !== null) {
      const totals = await this.saleRepository.execute(`SELECT
          pos_session_id,
            SUM(qty * price) AS total_amount,
            SUM(qty) AS total_qty
        FROM
          sale,
            json_table(
                details,
                "$.items[*]"
                columns(
                    qty int path "$.qty",
                    price int path "$.price"
                )
            ) d
        WHERE
        pos_session_id = ${session.id}
        GROUP BY
          pos_session_id`);

      let total_qty = 0;
      let total_amount = 0;
      if (totals.length != 0) {
        total_qty = totals[0].total_qty;
        total_amount = totals[0].total_amount;
      }

      await this.updateById(
        session.id, {
        total_qty: total_qty,
        total_amount: total_amount,
      }
      )

      session = await this.findOne({
        where: {
          organizationId: organizationId,
          branchOfficeId: branchOfficeId,
          status: 'started'
        }
      });
    }

    return session;
  }
}
