// `devices.climate_sensor`: the temperature/humidity part the firmware last reported reading.
// NULL (no climate sensor detected, or a gateway older than the column) and unknown values both
// mean "not known", so the dashboard names no part and no bus address.

export type ClimateSensor = 'sht31' | 'dht11';

/** The known sensor, or null for a missing or unrecognised value. */
export function climateSensorOf(value: string | null | undefined): ClimateSensor | null {
  return value === 'sht31' || value === 'dht11' ? value : null;
}

type ClimateLabels = {
  /** Settings devices row: the climate part plus the GY-302 light sensor. */
  title: string;
  subtitle: string;
  /** iPhone grouped row title and subtitle; the title shares a 375 pt row with the read status. */
  shortTitle: string;
  shortSubtitle: string;
  /** Sensors card footer for temperature and humidity. */
  hardware: string;
};

const LABELS: Record<ClimateSensor | 'none', ClimateLabels> = {
  sht31: {
    title: 'SHT31 + GY-302',
    subtitle: 'Temperature, humidity and light · I²C 0x44, 0x23',
    shortTitle: 'SHT31 + GY-302',
    shortSubtitle: 'Temp, humidity, light · I²C',
    hardware: 'SHT31 · I²C 0x44',
  },
  dht11: {
    title: 'DHT11 + GY-302',
    subtitle: 'Temperature, humidity and light · GPIO4, I²C 0x23',
    shortTitle: 'DHT11 + GY-302',
    shortSubtitle: 'Temp, humidity, light · GPIO4, I²C',
    hardware: 'DHT11 · GPIO4',
  },
  none: {
    title: 'Climate sensor + GY-302',
    subtitle: 'Temperature, humidity and light',
    shortTitle: 'Climate + GY-302',
    shortSubtitle: 'Temp, humidity, light',
    hardware: 'Climate sensor',
  },
};

export function climateLabels(value: string | null | undefined): ClimateLabels {
  return LABELS[climateSensorOf(value) ?? 'none'];
}
