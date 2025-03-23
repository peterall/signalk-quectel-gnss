// This is a SignalK plugin to parse Quectel LG580P specific messages from the NMEA stream.

module.exports = (app) => {
  let plugin = {
    id: 'signalk-quectel-gnss',
    name: 'Quectel GNSS',
    description: 'A SignalK plugin to parse Quectel specific messages from the NMEA stream.',
  };

  plugin.start = (settings, restartPlugin) => {
    app.handleMessage(plugin.id, {
      updates: [{
        meta: [
          {
            path: 'navigation.gnss.attitude.baseline',
            value: {
                units: "m"
            }
          },
        ]
      }]
    });

    app.emitPropertyValue('nmea0183sentenceParser', {
      sentence: 'PQTMTAR',
      parser: ({ id, sentence, parts, tags }, session) => {
        // parts will be <MsgVer>,<Time>,<Quality>,<Res>,<Length>,<Pitch>,<Roll>,<Heading>,<Acc_Pitch>,<Acc_Roll>,<Acc_Heading>,<UsedSV>
        // $PQTMTAR,1,160443.350,1,,0.000,,,,,,,23*6C
        const [msg_ver, time, quality, res, length, pitch, roll, heading, acc_pitch, acc_roll, acc_heading, usedsv] = parts;

        if (Number(length) !== 0 && pitch != "" && roll != "" && heading != "") {
          // measurements assume sensor is mounted longitudinally, however it's mounted transversely
          // so we need to rotate heading by 90 and normalize it to 0-2pi, and swap pitch and roll
          let heading_rad = (Number(heading) + 90) * Math.PI / 180;
          if (heading_rad > Math.PI) {
            heading_rad -= 2 * Math.PI;
          }

          const roll_rad = Number(pitch) * Math.PI / 180;
          const pitch_rad = Number(roll) * Math.PI / 180;

          const acc_roll_rad = Number(acc_pitch) * Math.PI / 180;
          const acc_pitch_rad = Number(acc_roll) * Math.PI / 180;
          const acc_yaw_rad = Number(acc_heading) * Math.PI / 180;

          return {
            updates: [
              {
                values: [
                  { path: 'navigation.headingTrue', value: heading_rad },
                  { path: 'navigation.attitude', value: { roll: roll_rad, pitch: pitch_rad, yaw: heading_rad } },
                  { path: 'navigation.gnss.attitude.accuracy', value: { roll: acc_roll_rad, pitch: acc_pitch_rad, yaw: acc_yaw_rad } },
                  { path: 'navigation.gnss.attitude.baseline', value: Number(length) },
                  { path: 'navigation.gnss.attitude.satellites', value: Number(usedsv) },
                ]
              }
            ]
          }
        } else if (Number(usedsv) > 0) {
          return {
            updates: [
              {
                values: [
                  { path: 'navigation.gnss.attitude.satellites', value: Number(usedsv) },
                ]
              }
            ]
          }
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

