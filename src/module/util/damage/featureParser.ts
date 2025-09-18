import { DamageFeature } from "./DamageFeature";

export function parseFeatureString(featureString: string): Record<string, DamageFeature> {
    const features: Record<string, DamageFeature> = {};
    featureString.split(",").forEach((feat) => {
        let temp = /([^0-9 ]+)\s*([0-9]*)/.exec(feat.trim());
        if (temp && temp[1]) {
            features[temp[1].toLowerCase()] = {
                name: temp[1],
                value: parseInt(temp[2]) || 1,
                active: false,
            };
        }
    });
    return features;
}
