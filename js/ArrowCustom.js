;(function() {
    'use strict'

    var root = this

    var has_require = typeof require !== 'undefined'

    var THREE = root.THREE || (has_require && require('three'))
    if (!THREE) throw new Error('Custom Arrow requires three.js')

    let _lineGeometry, _coneGeometry;
    const _axis = /*@__PURE__*/ new THREE.Vector3();

    class ArrowCustom extends THREE.Object3D {
        constructor(dir = new THREE.Vector3(0,0,1), origin = new THREE.Vector3(0, 0, 0), length = 1, color = 0xffff00, headLength = length * 0.2, headWidth = headLength * 0.2) {
            super();

            this.type = 'ArrowCustom';
            if ( _lineGeometry === undefined ) {

                _coneGeometry = new THREE.CylinderGeometry( 0, 0.5, 1, 5, 1 );
                _coneGeometry.translate( 0, - 0.5, 0 );

                this.position.copy( origin );

                let l = new MeshLine();
                l.setPoints([origin, origin.add(dir.addScalar(length))]);

                this.line = new THREE.Mesh(l, new MeshLineMaterial( { color: color, lineWidth: 5} ) );
                this.line.matrixAutoUpdate = false;
                this.add( this.line );

                this.cone = new THREE.Mesh( _coneGeometry, new THREE.MeshBasicMaterial( { color: color, toneMapped: false } ) );
                this.cone.matrixAutoUpdate = false;
                this.add( this.cone );

                // this.setDirection( dir );
                // this.setLength( length, headLength, headWidth );

            }
        }

        setDirection( dir ) {

            // dir is assumed to be normalized

            if ( dir.y > 0.99999 ) {

                this.quaternion.set( 0, 0, 0, 1 );

            } else if ( dir.y < - 0.99999 ) {

                this.quaternion.set( 1, 0, 0, 0 );

            } else {

                _axis.set( dir.z, 0, - dir.x ).normalize();

                const radians = Math.acos( dir.y );

                this.quaternion.setFromAxisAngle( _axis, radians );

            }

        }

        setLength( length, headLength = length * 0.2, headWidth = headLength * 0.2 ) {

            this.line.scale.set( 1, Math.max( 0.0001, length - headLength ), 1 ); // see #17458
            this.line.updateMatrix();

            this.cone.scale.set( headWidth, headLength, headWidth );
            this.cone.position.y = length;
            this.cone.updateMatrix();

        }

        setColor( color ) {

            this.line.material.color.set( color );
            this.cone.material.color.set( color );

        }

        copy( source ) {

            super.copy( source, false );

            this.line.copy( source.line );
            this.cone.copy( source.cone );

            return this;

        }

        dispose() {

            this.line.geometry.dispose();
            this.line.material.dispose();
            this.cone.geometry.dispose();
            this.cone.material.dispose();

        }

    }
    if (typeof exports !== 'undefined') {
        if (typeof module !== 'undefined' && module.exports) {
            exports = module.exports = {
                ArrowCustom: ArrowCustom,
            }
        }
        exports.ArrowCustom = ArrowCustom
    } else {
        root.ArrowCustom = ArrowCustom
    }

}.call(this))