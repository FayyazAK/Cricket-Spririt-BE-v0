import { Controller, Get, Query } from '@nestjs/common';
import { AddressService } from './address.service';
import { Serialize } from '../common/interceptors/response.interceptor';

@Controller('addresses')
export class AddressController {
  constructor(private readonly addressService: AddressService) {}

  @Get('cities')
  @Serialize()
  async getCities() {
    const cities = await this.addressService.getCities();
    return {
      message: 'Cities retrieved successfully',
      data: cities,
    };
  }

  @Get('states')
  @Serialize()
  async getStates() {
    const states = await this.addressService.getStates();
    return {
      message: 'States retrieved successfully',
      data: states,
    };
  }

  @Get('countries')
  @Serialize()
  async getCountries() {
    const countries = await this.addressService.getCountries();
    return {
      message: 'Countries retrieved successfully',
      data: countries,
    };
  }

  @Get('towns-suburbs')
  @Serialize()
  async getTownsSuburbs(
    @Query('city') city?: string,
    @Query('state') state?: string,
  ) {
    const townsSuburbs = await this.addressService.getTownsSuburbs(
      city,
      state,
    );
    return {
      message: 'Towns/Suburbs retrieved successfully',
      data: townsSuburbs,
    };
  }
}

