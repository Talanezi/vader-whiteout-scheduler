import {DataSource} from 'typeorm';
import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { oauth2ProviderNamesMap } from '../oauth2/oauth2-common';
import OAuth2Service from '../oauth2/oauth2.service';
import ServerInfoResponse from './server-info-response';

@Controller('server-info')
export default class ServerInfoController {
  private readonly oauth2ProviderSupport: ServerInfoResponse;

  constructor(oauth2Service: OAuth2Service,private readonly db:DataSource) {
    this.oauth2ProviderSupport = {} as ServerInfoResponse;
    for (const [providerType, providerName] of Object.entries(
      oauth2ProviderNamesMap,
    )) {
      this.oauth2ProviderSupport[
        (providerName.toLowerCase() +
          'OAuth2IsSupported') as keyof ServerInfoResponse
      ] = oauth2Service.providerIsSupported(+providerType);
    }
  }

  @Get('ready') async ready(){let timer:ReturnType<typeof setTimeout>|undefined;try{await Promise.race([this.db.query('SELECT 1'),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('timeout')),3000)})]);return {ok:true,service:'scheduler',database:'ready',revision:process.env.RAILWAY_GIT_COMMIT_SHA||'local'}}catch{throw new ServiceUnavailableException('Scheduler is temporarily unavailable. Please retry.')}finally{clearTimeout(timer)}}

  @ApiOperation({
    summary: 'Get server info',
    description:
      'Get the server information, including which features are supported.',
    operationId: 'getServerInfo',
  })
  @Get()
  getServerInfo(): ServerInfoResponse {
    return this.oauth2ProviderSupport;
  }
}
