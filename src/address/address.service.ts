import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../common/database/database.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

@Injectable()
export class AddressService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  async getCities() {
    const cities = await this.prisma.address.findMany({
      select: {
        city: true,
      },
      distinct: ['city'],
      orderBy: {
        city: 'asc',
      },
    });

    return cities.map((a) => a.city);
  }

  async getStates() {
    const states = await this.prisma.address.findMany({
      select: {
        state: true,
      },
      distinct: ['state'],
      orderBy: {
        state: 'asc',
      },
    });

    return states.map((a) => a.state);
  }

  async getCountries() {
    const countries = await this.prisma.address.findMany({
      select: {
        country: true,
      },
      distinct: ['country'],
      orderBy: {
        country: 'asc',
      },
    });

    return countries.map((a) => a.country);
  }

  async getTownsSuburbs(city?: string, state?: string) {
    const where: any = {};
    if (city) where.city = city;
    if (state) where.state = state;

    const townsSuburbs = await this.prisma.address.findMany({
      where,
      select: {
        townSuburb: true,
        city: true,
        state: true,
      },
      distinct: ['townSuburb', 'city', 'state'],
      orderBy: {
        townSuburb: 'asc',
      },
    });

    return townsSuburbs
      .filter((a) => a.townSuburb)
      .map((a) => ({
        townSuburb: a.townSuburb,
        city: a.city,
        state: a.state,
      }));
  }
}

