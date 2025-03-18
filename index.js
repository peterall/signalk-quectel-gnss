// This is a SignalK plugin to parse Quectel LG580P specific messages from the NMEA stream.

module.exports = (app) => {
  let plugin = {
    id: 'signalk-quectel-gnss',
    name: 'Quectel GNSS',
    description: 'A SignalK plugin to parse Quectel specific messages from the NMEA stream.',
  };

  plugin.start = (settings, restartPlugin) => {
    app.emitPropertyValue('nmea0183sentenceParser', {
      sentence: 'PQTMTAR',
      parser: ({ id, sentence, parts, tags }, session) => {
        // parts will be <MsgVer>,<Time>,<Quality>,<Res>,<Length>,<Pitch>,<Roll>,<Heading>,<Acc_Pitch>,<Acc_Roll>,<Acc_Heading>,<UsedSV>
        const baseline = Number(parts[4]);
        const usedSatellites = Number(parts[11]);
        const heading = Number(parts[7]);
        const pitch = Number(parts[5]);
        const roll = Number(parts[6]);
        const heading_accuracy = Number(parts[10]);
        const pitch_accuracy = Number(parts[8]);
        const roll_accuracy = Number(parts[9]);
        // measurements assume sensor is mounted longitudinally, however it's mounted transversely
        // so we need to rotate heading by 90 and normalize it to 0-360, and swap pitch and roll
        let heading_rad = (heading + 90) * Math.PI / 180;
        if (heading_rad > Math.PI) {
          heading_rad -= 2 * Math.PI;
        }
        const pitch_rad = roll * Math.PI / 180;
        const roll_rad = pitch * Math.PI / 180;
        return {
          updates: [
            {
              values: [
                { path: 'navigation.headingTrue', value: heading_rad },
                { path: 'navigation.attitude', value: { roll: roll_rad, pitch: pitch_rad, yaw: heading_rad } },
                { path: 'navigation.attitudeAccuracy', value: { roll: pitch_accuracy, pitch: roll_accuracy, yaw: heading_accuracy } },
                { path: 'navigation.attitudeBaseline', value: baseline },
                { path: 'navigation.attitudeSatellites', value: usedSatellites },
              ]
            }
          ]
        }
      }
    });
    app.setPluginStatus('Started');

  };

  plugin.stop = () => {
    app.setPluginStatus('Stopped');
  };

  plugin.schema = () => {};

  return plugin;
};

