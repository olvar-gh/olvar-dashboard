import { climateLabels, climateSensorOf } from '../climate-sensor';

describe('climate sensor', () => {
  it('keeps the two known parts and treats anything else as unknown', () => {
    expect(climateSensorOf('sht31')).toBe('sht31');
    expect(climateSensorOf('dht11')).toBe('dht11');
    expect(climateSensorOf(null)).toBeNull();
    expect(climateSensorOf(undefined)).toBeNull();
    expect(climateSensorOf('SHT31')).toBeNull();
    expect(climateSensorOf('bme280')).toBeNull();
  });

  it('names the part and its bus, or neither when it is not known', () => {
    expect(climateLabels('sht31')).toMatchObject({
      title: 'SHT31 + GY-302',
      subtitle: 'Temperature, humidity and light · I²C 0x44, 0x23',
      hardware: 'SHT31 · I²C 0x44',
    });
    expect(climateLabels('dht11')).toMatchObject({
      title: 'DHT11 + GY-302',
      subtitle: 'Temperature, humidity and light · GPIO4, I²C 0x23',
      hardware: 'DHT11 · GPIO4',
    });
    for (const value of [null, undefined, 'bme280']) {
      const labels = climateLabels(value);
      expect(labels).toMatchObject({ title: 'Climate sensor + GY-302', shortTitle: 'Climate + GY-302', hardware: 'Climate sensor' });
      expect(Object.values(labels).join(' ')).not.toMatch(/0x|GPIO/);
    }
  });

  it('keeps the iPhone titles about as short as the SHT31 one, so a 375 pt row does not clip them', () => {
    const longest = 'SHT31 + GY-302'.length + 2;
    for (const value of ['sht31', 'dht11', null]) {
      const { shortTitle } = climateLabels(value);
      expect(shortTitle).toContain('GY-302');
      expect(shortTitle.length).toBeLessThanOrEqual(longest);
    }
  });
});
